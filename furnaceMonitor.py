#!/usr/bin/python


import MPU6050
import math
import time
import numpy
import struct
import requests
import datetime
import pytz


furnaceMotorPeak = 56.0
peakDelta = 2.0

tz = pytz.timezone("America/Denver")

# the URL to post updates to
updateUrl = 'http://cjparker.us/furnace/api/updateStatus'

# take this many samples each second
samplesPerSecond = 250

# collect this many total samples
totalSamplesToCollect = 1000

# here, we're using the FIFO buffer of the MPU6050, and we'll tell it to only count the accelerometer data
bytesPerSample = 6  # accelX, accelY, accelZ

# this is the length of the FIFO buffer in bytes
fifoSizeBytes = 1024

# i use this to determine how often to sleep while measuring, to save the CPU, but it's not used here
bufferReadThreshold = 0.10

# the MPU6050 can do +/- 2G, 4G, 8G, or 16G where 2G is the most sensitive
accelResolution = 2

# in the final analysis, anything with an overall strength value lower than this is considered noise
noiseThreshold = 0.002

# this is how we convert the raw number from the accel into a value relative to earth gravity
accelValueToGConversion = float(accelResolution) / 32768.0

# this is how many bytes we can suck out of the MPU6050 FIFO at a time
batchSizeBytes = 32.0

# prelims
mpu6050 = MPU6050.MPU6050()
mpu6050.setup()
mpu6050.setGResolution(2)

mpu6050.setSampleRate(samplesPerSecond)

# disable the fifo to start
mpu6050.enableFifo(False)

# wait a spell for the MPU to catch up
time.sleep(0.10)

# now reset
mpu6050.resetFifo()

# enable, and capture all the readings
mpu6050.enableFifoAccelOnly(True)

totalSampleCounter = 0
sampleAccumulator = []

print("sampling...")
while totalSampleCounter < totalSamplesToCollect:
    # the MPU tells us how many bytes are available to read from the FIFO
    bytesAvailable = mpu6050.readFifoCount()

    # print("{0} bytesAvailable".format(bytesAvailable))

    # if you don't suck the bytes out of the FIFO fast enough, the MPU will overwrite them, and set this flag
    # if this happens the data will be 'corrupted'
    status = mpu6050.readStatus()
    if status & 0b00010000:
        print("OVERFLOW!!!!!")
        # todo we could exit here

    # while there are bytes available to be read, get em
    while bytesAvailable > 0:
        bytesToRead = int(batchSizeBytes) if bytesAvailable > int(batchSizeBytes) else bytesAvailable
        sampleAccumulator.extend(mpu6050.readNFromFifo(bytesToRead))
        totalSampleCounter += bytesToRead / bytesPerSample
        # print("{0} bytesRead".format(bytesToRead))
        bytesAvailable -= bytesToRead

    # this is a way to save CPU by sleeping a little while letting the MPU fill up the FIFO
    # at higher sample rates this will just cause overflow, but in a case of continuous sampling
    # this would be useful, but we're not worrying about it here

    samplesToAccum = (bufferReadThreshold * fifoSizeBytes) / float(bytesPerSample)
    secondsToAccum = samplesToAccum / float(samplesPerSecond)
    # print("sleeping {0}".format(secondsToAccum))
    # time.sleep(secondsToAccum)

print("collected {0} samples".format(totalSampleCounter))
print("sample array length {0}".format(len(sampleAccumulator)))

totalAccelSamples = []

# now we need to deal with the individual bytes in the FIFO
for sampleCount in range(0, totalSampleCounter + 1):
    # figure out where each 'block' of the 3 (x,y,z) samples starts and ends
    start = sampleCount * bytesPerSample
    end = start + bytesPerSample

    # get one sample of 6 bytes, 2 for each of X,Y,Z
    sample = sampleAccumulator[start:end]

    if (len(sample) <= 0):
        print("skipping empty sample")
        continue


    # do some bit twiddling to isolate 2 bytes for each sample
    rawX = struct.unpack(">h", buffer(bytearray(sample[0:2])))[0]
    rawY = struct.unpack(">h", buffer(bytearray(sample[2:4])))[0]
    rawZ = struct.unpack(">h", buffer(bytearray(sample[4:6])))[0]

    # print("rawX:{0} rawY:{1} rawZ:{2}".format(rawX, rawY, rawZ))
    # convert the raw values into actual G values
    x = rawX * accelValueToGConversion
    y = rawY * accelValueToGConversion
    z = rawZ * accelValueToGConversion

    # print("x:{0:10.20} y:{1:10.20} z:{2:10.20}".format(x,y,z))

    # we are measuring acceleration in all 3 directions, but for our purposes here, we just need a single offset value
    # so we basically use the 'distance formula' in 3D  distance = sqrt(a^2 + b^2 + c^2)
    totalAccel = math.sqrt((x * x) + (y * y) + (z * z))
    totalAccelSamples.append(totalAccel)

# use numpy to do an fft of all the samples
fourier = numpy.fft.fft(totalAccelSamples)
fftData = numpy.abs(fourier[0:len(fourier) / 2 + 1]) / totalSampleCounter

frequency = []
freqStrengthPairs = []

# collect the data
for loop in range(totalSampleCounter / 2 + 1):
    # this builds a list of all the different frequencies
    frequency.append(float(loop) * float(samplesPerSecond) / float(totalSampleCounter))
    # spectrumOutputFile.write("{0:10.2f},{1:10.20f}\n".format(frequency[loop], fftData[loop]))
    d = {'freq': frequency[loop], 'strength': fftData[loop]}
    freqStrengthPairs.append(d)

# throw away everything below a certain threshold
trimmedPairs = [pair for pair in freqStrengthPairs if pair['strength'] >= noiseThreshold]
print("we have {0} peaks above the noise level".format(len(trimmedPairs)))

# look for our peak
detectPeak = [pair for pair in trimmedPairs if
              (pair['freq'] >= furnaceMotorPeak - peakDelta) and (pair['freq'] <= furnaceMotorPeak + peakDelta)]
if (len(detectPeak) > 0):
    print("PEAK DETECTED!")
    sortedPairs = sorted(trimmedPairs, key=lambda k: -k['strength'])
    for pair in sortedPairs:
        print(pair)

    post = {
        'dateTime': datetime.datetime.now(tz).strftime('%Y-%m-%dT%H:%M:%S%z'),
        'running': True
    }
    resp = requests.post(updateUrl, json=post)
    print('post response is {0}', resp)

else:
    print("no peak")
    post = {
        'dateTime': datetime.datetime.now(tz).strftime('%Y-%m-%dT%H:%M:%S%z'),
        'running': False
    }
    resp = requests.post(updateUrl, json=post)







#!/usr/bin/python


import MPU6050
import math
import time
import numpy
import struct


samplesPerSecond = 250
totalSamplesToCollect = 4000
bytesPerSample = 6  # accelX, accelY, accelZ
fifoSizeBytes = 1024
bufferReadThreshold = 0.10
accelResolution = 2

accelValueToGConversion = float(accelResolution) / 32768.0

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

batchSizeBytes = 32.0

totalSampleCounter = 0
sampleAccumulator = []

print("sampling...")
while totalSampleCounter < totalSamplesToCollect:
    # see how many bytes we can read
    bytesAvailable = mpu6050.readFifoCount()
    #print("{0} bytesAvailable".format(bytesAvailable))

    status = mpu6050.readStatus()
    if status & 0b00010000:
        print("OVERFLOW!!!!!")

    while bytesAvailable > 0:
        bytesToRead = int(batchSizeBytes) if bytesAvailable > int(batchSizeBytes) else bytesAvailable
        sampleAccumulator.extend(mpu6050.readNFromFifo(bytesToRead))
        totalSampleCounter += bytesToRead / bytesPerSample
        #print("{0} bytesRead".format(bytesToRead))
        bytesAvailable -= bytesToRead

    # let the buffer fill up to around 75% full
    samplesToAccum = (bufferReadThreshold * fifoSizeBytes) / float(bytesPerSample)
    secondsToAccum = samplesToAccum / float(samplesPerSecond)
    #print("sleeping {0}".format(secondsToAccum))
    #time.sleep(secondsToAccum)

print("collected {0} samples".format(totalSampleCounter))
print("sample array length {0}".format(len(sampleAccumulator)))

totalAccelSamples = []

for sampleCount in range(0,totalSampleCounter+1):
  start = sampleCount * bytesPerSample
  end = start + bytesPerSample
  sample = sampleAccumulator[start:end]
  rawX = struct.unpack(">h", buffer(bytearray(sample[0:2])))[0]
  rawY = struct.unpack(">h", buffer(bytearray(sample[2:4])))[0]
  rawZ = struct.unpack(">h", buffer(bytearray(sample[4:6])))[0]

  #print("rawX:{0} rawY:{1} rawZ:{2}".format(rawX, rawY, rawZ))
  x = rawX * accelValueToGConversion
  y = rawY * accelValueToGConversion
  z = rawZ * accelValueToGConversion

  #print("x:{0:10.20} y:{1:10.20} z:{2:10.20}".format(x,y,z))

  totalAccel = math.sqrt( (x*x) + (y*y) + (z*z) )
  totalAccelSamples.append(totalAccel)
   
  
fourier = numpy.fft.fft(totalAccelSamples)
fftData = numpy.abs(fourier[0:len(fourier) / 2 + 1]) / totalSampleCounter
frequency = []

spectrumOutputFile = open("frequencyPlot.csv","w")

for loop in range(totalSampleCounter/ 2 + 1):
  frequency.append(float(loop) * float(samplesPerSecond) / float(totalSampleCounter))
  spectrumOutputFile.write("{0:10.2f},{1:10.20f}\n".format(frequency[loop], fftData[loop]))



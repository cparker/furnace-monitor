#!/usr/bin/python


import MPU6050
import time

# prelims
mpu6050 = MPU6050.MPU6050()
mpu6050.setup()
mpu6050.setGResolution(2)

# disable the fifo to start
mpu6050.enableFifo(False)

# wait a spell for the MPU to catch up
time.sleep(0.10)

# now reset
mpu6050.resetFifo()



for n in range(1, 11):
    simpleData = mpu6050.readData()
    print("temp {0}, accX {0}".format(simpleData.Temperature, simpleData.Gx))
    time.sleep(1)



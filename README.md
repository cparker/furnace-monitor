Furnace Monitor
===

I want to monitor the run time of the furnace in my house using a Raspberry Pi and an [MPU6050 accelerometer](http://www.amazon.com/Kootek-MPU-6050-MPU6050-sensors-Accelerometer/dp/B008BOPN40) to detect the vibration of the blower.

This is largely based on the great work by **Dan Perron** and his [code here](https://github.com/danjperron/mpu6050TestInC.git) and [forum post here](https://www.raspberrypi.org/forums/viewtopic.php?p=489229).

The UI is angular 1.4, the server is node.js express, python handles the IO with the MPU6050.

Here's a screenshot of the app

![screenshot](https://raw.githubusercontent.com/cparker/furnace-monitor/master/readmePics/app-mockup.png)

Here's what an FFT looks like when sampling at 250Hz when the furnace blower is running:

![screenshot](https://raw.githubusercontent.com/cparker/furnace-monitor/master/readmePics/furnace-fft.png)

The python code just looks for the peak around 56Hz to determine if the furnace is off or on.



# The Hour 🕰️ ⚙️
'The Hour' is a 3D-printable marble desk top clock. It was made to mimic the classic striking of the hour of a traditional clock but with marbles. The model was designed specifically for the Marble Runs competition and fits neatly onto standard printer beds and uses gravity to trigger the bell strike.

## Demo Video
[![Watch the Demo On YouTube](https://img.youtube.com/vi/UPdoJaWenXM/maxresdefault.jpg)](https://youtu.be/UPdoJaWenXM)

## Features
* Automatically connects to WiFi and syncs time securely via NTP.
* Handles UK daylight savings (GMT/BST) automatically.
* Strikes 1-12 times on the hour.
* Strikes exactly once on the half-hour and on initial start up.
* IR detector mechanism ensures safe pacing of marble drops by stopping the servo.

## Hardware Requirements
* [GeekServo Building Bricks 360 Degree Servo](https://shop.pimoroni.com/products/geekservo-building-bricks-360-degree-servo?variant=40401223811155)
* Infrared Reflective Sensor Module (TCRT5000)
* 60mm Brass Bell
* 3D Printed parts (STL files provided in `/stl`)
* Raspberry Pi Pico W
* 120x220 Glass Cloche / Display Dome (optional)
* 4x 14mm Marbles

## Wiring (Raspberry Pi Pico W)
| Component | Pin on Pico | Note |
| :--- | :--- | :--- |
| **GeekServo 360** | GPIO 15 (PWM) | Needs VSYS (5V) and GND |
| **TCRT5000 Sensor** | GPIO 14 (IN) | Digital Output (D0) to GPIO 14 |
| **TCRT5000 VCC** | GPIO 13 (OUT) | Powers the sensor dynamically |

## Logic Overview
Driven by a Raspberry Pi Pico W syncing via NTP (Network Time Protocol), the mechanism includes an IR detector to detect when a marble falls, stopping the servo and allowing a silent marble run and strike of the bell. It then runs again, counting each marble until the number of marbles matches the time. In addition it chimes once on the half hour and on the initial start up.

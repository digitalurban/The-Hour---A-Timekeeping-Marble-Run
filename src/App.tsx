import React, { useState } from 'react';
import { Github, FileText, Code, Check, Copy } from 'lucide-react';

// Content Definitions
const printablesContent = `
# The Hour - A Timekeeping Marble Run (Desk Toy)

'The Hour' is a 3D-printable marble desk top clock. It was made to mimic the classic striking of the hour of a traditional clock but with marbles. The model was designed specifically for the Marble Runs competition and fits neatly onto standard printer beds and uses gravity to trigger the bell strike.

### How it works
Driven by a Raspberry Pi Pico W syncing via NTP (Network Time Protocol), the mechanism includes an IR detector to detect when a marble falls, stopping the servo and allowing a silent marble run and strike of the bell. It then runs again, counting each marble until the number of marbles matches the time. In addition it chimes once on the half hour and on the initial start up.

### Hardware 🛠️
*   **1x** GeekServo 360-Degree Continuous Rotation Servo (LEGO compatible housing makes it easy to mount)
*   **1x** TCRT5000 IR Reflective Sensor Module
*   **1x** 60mm Brass Bell
*   **1x** Raspberry Pi Pico W (to connect to WiFi, keep time, and run the logic)
*   **1x** 120x220 Glass Cloche / Display Dome (optional)
*   **4x** 14mm Marbles

### Printing Instructions 🖨️
*   **Material:** PLA
*   **Supports:** Required for the main base with the Archimedes lift holder - these are easy to remove.
*   **Orientation:** Print the track flat. The lift should be printed vertically.

### Assembly
1. Seat the GeekServo into the base mount.
2. Slide the Archimedes screw onto the GeekServo spline.
3. Slide on the brass bell onto the center pedestal.
4. Mount the TCRT5000 sensor in the holder at the start of the track - it has a screw at the back to adjust the sensitivity of the marble detection, turn this on first set up to detect a marble as it goes past.
5. Wire the Servo and Sensor to your Pico W (see my GitHub for the MicroPython code).
6. Drop in your marbles, place the dome on top. On first power up it connects to wifi, sets the time and makes 1 ring of the bell to confirm set up - then sit back and wait for either the half hour (one strike) or the hour (a full hour count) to strike.

I hope you enjoy it, it sits on my desk and provides a nice, traditional clock chime but via marbles.
`;

const githubContent = `
# The Hour 🕰️ ⚙️
'The Hour' is a 3D-printable marble desk top clock. It was made to mimic the classic striking of the hour of a traditional clock but with marbles. The model was designed specifically for the Marble Runs competition and fits neatly onto standard printer beds and uses gravity to trigger the bell strike.

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
* 3D Printed parts (STL files provided in \`/stl\`)
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
`;

const codeContent = `
import uasyncio as asyncio
import machine
from machine import Pin, PWM
import time
import ntptime
import network

# --- CONFIGURATION ---
WIFI_SSID = ''
WIFI_PASSWORD = ''

MOTOR_PIN = 15
SENSOR_PIN = 14
SENSOR_PWR_PIN = 13  

# Setup Pins
sensor = Pin(SENSOR_PIN, Pin.IN, Pin.PULL_UP)
sensor_power = Pin(SENSOR_PWR_PIN, Pin.OUT)
sensor_power.value(0) 

def is_bst(year, month, day, hour):
    """Returns True if the date is within British Summer Time."""
    if month < 3 or month > 10:
        return False
    if month > 3 and month < 10:
        return True
    
    # Last Sunday of March
    last_sunday_march = 31 - (int(5 * year / 4 + 4) % 7)
    if month == 3:
        return day > last_sunday_march or (day == last_sunday_march and hour >= 1)
    
    # Last Sunday of October
    last_sunday_oct = 31 - (int(5 * year / 4 + 1) % 7)
    if month == 10:
        return day < last_sunday_oct or (day == last_sunday_oct and hour < 1)

def get_local_time():
    """Adjusts UTC from NTP to local UK time (GMT or BST)."""
    t = time.localtime() # Get current UTC from board
    year, month, day, hour = t[0], t[1], t[2], t[3]
    
    offset = 3600 if is_bst(year, month, day, hour) else 0
    return time.localtime(time.time() + offset)

def strike_clock(count, is_half_hour=False):
    if is_half_hour:
        strike_target = 1
        print("--- HALF HOUR CHIME ---")
    else:
        # 12-hour format for striking
        strike_target = count % 12
        if strike_target == 0: strike_target = 12
        print(f"--- STRIKING {strike_target} TIMES (Hour: {count}) ---")
    
    sensor_power.value(1)
    time.sleep(0.1) 
    
    motor = PWM(Pin(MOTOR_PIN))
    motor.freq(50)
    
    servoStop = 150000
    servoForward = 1300000 

    for i in range(1, strike_target + 1):
        print(f"Lifting marble {i}...")
        motor.duty_ns(servoForward)
        
        # --- TIMEOUT LOGIC ---
        start_wait = time.time()
        timeout_occurred = False
        
        while sensor.value() == 1:
            # If 60 seconds pass without the sensor being triggered (value 0)
            if time.time() - start_wait > 60:
                print("TIMEOUT: No marble detected for 60 seconds. Stopping.")
                timeout_occurred = True
                break
            time.sleep(0.01)
            
        if timeout_occurred:
            motor.duty_ns(servoStop)
            break # Exit the 'for' loop to stop trying for further marbles
        # ---------------------
        
        print(f"Marble {i} detected!")
        motor.duty_ns(servoStop)
        time.sleep(3.0) # Bell drop time
        time.sleep(0.5) # Reset cooldown
        
    sensor_power.value(0)
    motor.deinit()

async def run_clock_logic():
    prev_minute = -1
    while True:
        try:
            # Get the time adjusted for BST/GMT
            t = get_local_time()
            current_hour = t[3]
            current_min = t[4]
            
            # Print status to console for debugging
            if current_min != prev_minute:
                print(f"Clock Status: {t[3]:02d}:{t[4]:02d}")
            
            # Full Hour Trigger
            if current_min == 0 and current_min != prev_minute:
                strike_clock(current_hour)
                prev_minute = current_min
                # Sync NTP daily at 2am (quiet time)
                if current_hour == 2:
                    try: ntptime.settime()
                    except: pass

            # Half Hour Trigger
            elif current_min == 30 and current_min != prev_minute:
                strike_clock(1, is_half_hour=True)
                prev_minute = current_min
            
            prev_minute = current_min
            await asyncio.sleep(30) 
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(60)

async def main():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    print("Connecting to WiFi...")
    
    for _ in range(20):
        if wlan.isconnected(): break
        time.sleep(1)
        
    if wlan.isconnected():
        try:
            ntptime.settime()
            print("Time Synced.")
        except:
            print("NTP Fail.")
    
    # Test strike on boot
    strike_clock(1)
    
    await run_clock_logic()

try:
    asyncio.run(main())
finally:
    # Final safety shutdown
    sensor_power.value(0)
    try:
        m = PWM(Pin(MOTOR_PIN))
        m.duty_ns(150000)
        m.deinit()
    except:
        pass
`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'printables' | 'github' | 'code'>('printables');
  const [copied, setCopied] = useState(false);

  const getActiveContent = () => {
    switch (activeTab) {
      case 'printables': return printablesContent;
      case 'github': return githubContent;
      case 'code': return codeContent;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent().trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-neutral-200 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FA5C00] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white text-xl">🔔</span>
            </div>
            The Hour - Project Documents
          </h1>
          <p className="text-neutral-400">
            Generated Markdown for your Printables contest entry, GitHub README, and MicroPython Integration Code.
          </p>
        </header>

        <div className="bg-[#242424] rounded-xl overflow-hidden border border-[#333333] shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-[#1E1E1E] border-b border-[#333333] overflow-x-auto">
            <button
              onClick={() => setActiveTab('printables')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'printables' ? 'text-[#FA5C00] border-b-2 border-[#FA5C00] bg-[#2A2A2A]' : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#2A2A2A]'}`}
            >
              <FileText size={18} />
              Printables Post
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'github' ? 'text-white border-b-2 border-white bg-[#2A2A2A]' : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#2A2A2A]'}`}
            >
              <Github size={18} />
              GitHub README
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'code' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#2A2A2A]' : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#2A2A2A]'}`}
            >
              <Code size={18} />
              MicroPython Code
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-[#333333] bg-[#2A2A2A]">
            <div className="text-sm text-neutral-400 font-mono">
              {activeTab === 'printables' && 'description.md'}
              {activeTab === 'github' && 'README.md'}
              {activeTab === 'code' && 'hour_task.py'}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-[#3A3A3A] hover:bg-[#4A4A4A] active:bg-[#5A5A5A] text-white rounded-md transition-colors"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 bg-[#1A1A1A] overflow-x-auto">
            <pre className="font-mono text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap selection:bg-[#FA5C00] selection:text-white">
              {getActiveContent().trim()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

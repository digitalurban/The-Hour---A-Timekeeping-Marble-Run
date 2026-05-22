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

---
title: Creating a Web Thermometer
published: false
description: Learn how to build a web thermometer with Web Bluetooth and Web Components
tags: Sensors, WebBluetooth, Fugu
# cover_image: 
# published_at: 2023-08-01 22:00 +0000
---

# Temperature Sensor in Thingy:52

The [Thingy:52](https://www.nordicsemi.com/Products/Development-hardware/Nordic-Thingy-52) by [Nordic Semiconductor](https://www.nordicsemi.com/) has a lot of built-in sensors (temperature, humidity, pressure, air quality, color, accelerometer, gyroscope, and more).

In our case, we are interested in reading values from the temperature sensor, so let's take a look in the [documentation](https://nordicsemiconductor.github.io/Nordic-Thingy52-FW/documentation/firmware_architecture.html) for the device:

![Thingy52 GATT Temperature](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/s8049wrxzvqmh9s98rjq.png)

*Note: The `xxxx` in the base UUID should be replaced with numbers from the same column for service and characteristic(s).*

From this, we can see two 128bit UUIDs we need:

* `ef680200-9b35-4933-9b10-52ffa9740042` - the "Weather station service"
* `ef680201-9b35-4933-9b10-52ffa9740042` - the "Temperature characteristic"

It's also a good idea to fetch the battery level, which follows the officially assigned 16bit UUID for battery service:

![GATT BatteryService](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6i5cqcz3e15j0e3h36z0.png)

Connecting to the Thingy:52 from a web application is quite easy, just remember to list the services that might be required for your app in the list of `optionalServices`:

```javascript
const THINGY_CONFIGURATION_SERVICE_UUID = 'ef680100-9b35-4933-9b10-52ffa9740042';
const WEATHER_STATION_SERVICE_UUID      = 'ef680200-9b35-4933-9b10-52ffa9740042';
...
const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [THINGY_CONFIGURATION_SERVICE_UUID] }],
    optionalServices: [
        'battery_service',
        WEATHER_STATION_SERVICE_UUID
    ]
});
```

## Temperature data

The temperature data is made available under the `Weather Station Service` and in order to read the data, you'll need to subscribe to the temperature updates on the `Temperature Characteristic`:

```javascript
const TEMPERATURE_CHARACTERISTIC_UUID   = 'ef680201-9b35-4933-9b10-52ffa9740042';
...
async #startThermometerNotifications(server) {
    const service = await server.getPrimaryService(WEATHER_STATION_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(TEMPERATURE_CHARACTERISTIC_UUID);
    characteristic.addEventListener('characteristicvaluechanged', this.#onThermometerChange.bind(this));
    return characteristic.startNotifications();
}
```

Whenever there is an update, read out the values:

```javascript
_onThermometerChange(event) {
    const target = event.target;

    const integer = target.value.getInt8(0);
    const decimal = target.value.getUint8(1);

    const celsius = Number.parseFloat(`${integer}.${decimal}`);

    const temperature = {
        celsius,
        fahrenheit: celsius * 9 / 5 + 32,
        kelvin: celsius + 273.15
    }

    this.dispatchEvent(new CustomEvent('thermometer', {
        detail: temperature
    }));
}
```

# Thermometer Web Component

We'll need some visualization for the thermometer, and I found a very nice [thermometer made in pure css](https://jsfiddle.net/mirceageorgescu/gBW3Y/) by [Mircea Georgescu](https://github.com/mirceageorgescu), which will be a good base for a simple thermometer web component.

![CSS Thermometer](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cnrnc73s1mt6hkx9e5o4.png)

Disclaimer: I am definitely not a CSS expert, so sorry Mircea for the hacks I made :)

For the purpose of this demo, I have hacked the linear-gradient used for the positioning of the level and the position of the temperature reading:

```javascript
_handleTemperature({detail}) {
    this.#celsius.innerHTML = `${detail.celsius.toFixed(1)}&deg;C`;
    this.#celsius.style.transform = `translateY(${-detail.celsius/2}px)`;

    const perc = 50 - (detail.celsius * 0.32);
    this.#thermometer.style.background = `linear-gradient(#fff 0%, #fff ${perc}%, #d00 ${perc}%, #d00 100%)`
}
```

The full source of the component is here: // link

# Building the application

Handling the connection to the Thingy:52 will be done with a scaled down variant what I did in another post: [Generic Sensors and Thingy:52](https://dev.to/denladeside/generic-sensors-and-thingy52-9oa).  It injects a small widget in the page that handles connectivity and shows battery levels.

Besides that (the `thingy52-widget`), the application only consists of the new thermometer UI component:

```html
<body>
    <thingy52-widget></thingy52-widget>
    <div class="flex-container">
        <div class="content">
            <div class="col">
                <h2>Web Thermometer</h2>
                <thermometer-ui></thermometer-ui>
            </div>
        </div>
    </div>
</body>
```

# All working together

![Web Temperature APP](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/jaik84a80elshjo3h6gr.png)

Feedback, request, issue reports and PRs are very welcome!

Enjoy ;)
// @ts-check

// Thingy52Driver
//
// Supports:
//   * Thermometer
//   * Battery
//
// Documentation: https://nordicsemiconductor.github.io/Nordic-Thingy52-FW/documentation/firmware_architecture.html

const THINGY_CONFIGURATION_SERVICE_UUID = 'ef680100-9b35-4933-9b10-52ffa9740042';
const WEATHER_STATION_SERVICE_UUID      = 'ef680200-9b35-4933-9b10-52ffa9740042';
const TEMPERATURE_CHARACTERISTIC_UUID   = 'ef680201-9b35-4933-9b10-52ffa9740042';

export const Thingy52Driver = new class extends EventTarget {
    // Private variables
    #device // Just allow one device connected at the same time

    // Private methods
    async #openDevice(device) {
        // if already connected to a device - close it
        if (this.#device) {
            this.disconnect();
        }

        const server = await device.gatt.connect();

        device.ongattserverdisconnected = e => this.#disconnected(e);

        this.#device = device;
        this.dispatchEvent(new CustomEvent('connect', {detail: { device }}));

        // Initialize sensor notifications
        await this.#startThermometerNotifications(server);

        // On Linux with earlier versions of BlueZ, there is an issue with 16bit IDs
        try {
            await this.#startBatteryNotifications(server);
        } catch(err) {
            console.log("Error with battery service: ", err);
        }

        console.log('Opened device: ', device);
    }

    // BATTERY
    #onBatteryChange(event) {
        const target = event.target;
        const deviceId = target.service.device.id;

        const battery = target.value.getUint8(0);

        this.dispatchEvent(new CustomEvent('battery', {
            detail: { battery }
        }));
    }

    async #startBatteryNotifications(server) {
        const service = await server.getPrimaryService('battery_service');
        const characteristic = await service.getCharacteristic('battery_level');

        // Read and send initial value
        const battery = (await characteristic.readValue()).getUint8(0);
        this.dispatchEvent(new CustomEvent('battery', {
            detail: { battery }
        }));

        characteristic.addEventListener('characteristicvaluechanged', this.#onBatteryChange.bind(this));
        return characteristic.startNotifications();
    }

    // THERMOMETER
    #onThermometerChange(event) {
        const target = event.target;

        const integer = target.value.getInt8(0);
        const decimal = target.value.getUint8(1);

        const celsius = Number.parseFloat(`${integer}.${decimal}`);

        const temperature = {
            celsius,
            fahrenheit: celsius * 9 / 5 + 32,
            kelvin: celsius + 273.15
        }

        this.dispatchEvent(new CustomEvent('temperature-change', {
            detail: temperature
        }));
    }

    async #startThermometerNotifications(server) {
        const service = await server.getPrimaryService(WEATHER_STATION_SERVICE_UUID);
        const characteristic = await service.getCharacteristic(TEMPERATURE_CHARACTERISTIC_UUID);
        characteristic.addEventListener('characteristicvaluechanged', this.#onThermometerChange.bind(this));
        return characteristic.startNotifications();
    }

    #disconnected(evt) {
        this.dispatchEvent(new Event('disconnect'));
    }

    // Public methods
    disconnect() {
        this.#device?.gatt?.disconnect();
        this.#device = undefined;
    }

    async scan() {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [THINGY_CONFIGURATION_SERVICE_UUID] }],
            optionalServices: [
                'battery_service',
                WEATHER_STATION_SERVICE_UUID
            ]
        });

        if (device) {
            await this.#openDevice(device);
        }
    }
}

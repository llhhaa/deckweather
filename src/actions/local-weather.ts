import { action, streamDeck, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import fetch from 'node-fetch';
import * as https from 'https';

/**
 * An action class that displays the current temperature when the current button is pressed.
 */
@action({ UUID: "com.luke-abel.local-weather.display-weather" })
export class DisplayWeather extends SingletonAction<LocalWeatherSettings> {

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<LocalWeatherSettings>): void {
		// Handle the settings changing in the property inspector (UI).
		// streamDeck.logger.info('----------DEBUGGING didreceive');
		// streamDeck.logger.info(ev);
		// fetchWeather(ev);
	}

	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}.
	 */
	override async onWillAppear(ev: WillAppearEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------DEBUGGING willappear');
		const settings = await fetchWeather(ev);
		return ev.action.setTitle(roundTemp(settings.temperature));
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable.
	 */
	override async onKeyDown(ev: KeyDownEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------DEBUGGING onkeydown');
		const settings = await fetchWeather(ev);
		return ev.action.setTitle(roundTemp(settings.temperature));
	}
}

/**
 * Set weather information to the action settings.
 */
async function fetchWeather(ev: DidReceiveSettingsEvent|WillAppearEvent|KeyDownEvent) {
	const settings = ev.payload.settings as LocalWeatherSettings;
	const weather: WeatherData = await openweatherData(settings.openweatherApiKey, settings.latitude, settings.longitude);
	return {
		temperature: weather.temperature,
		humidity: weather.humidity,
		description: weather.description,
		icon: weather.icon
	} as DisplayWeatherSettings;
}

function roundTemp(temp: number|undefined) {
	streamDeck.logger.info('----------DEBUGGING roundTemp');
	streamDeck.logger.info(temp);
	const rounded = Math.round((temp || 0) * 10) / 10
	return `${rounded}°`
}

async function openweatherData(apiKey: string, lat: string, lon: string) {
    return new Promise<WeatherData>((resolve, reject) => {
        const options = {
            hostname: 'api.openweathermap.org',
            port: 443,
            path: `/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
            method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
        };

		streamDeck.logger.info('DEBUGGING');
		streamDeck.logger.info(options);

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
				streamDeck.logger.info('DEBUGGING');
				streamDeck.logger.info(data);
                try {
                    const jsonData = JSON.parse(data);

					streamDeck.logger.info('DEBUGGING');
					streamDeck.logger.info(jsonData);

                    // Extract relevant weather information
                    const temperature = jsonData.main.temp;
                    const description = jsonData.weather[0].description;
                    const icon = jsonData.weather[0].icon;

                    resolve({ temperature, description, icon } as WeatherData);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

/**
 * Settings for {@link DisplayWeather}.
 */
type LocalWeatherSettings = {
	// user-provided settings
	openweatherApiKey: string;
	latitude: string;
	longitude: string;
};

type DisplayWeatherSettings = {
	// data fetched from API
	temperature?: number;
	description?: string;
	icon?: string;
};

type WeatherData = {
    temperature: number;
	humidity: number;
    description: string;
    icon: string
}

type OpenWeatherResponse = {
	weather: {
        description: string;
        icon: string;
    }[];
    main: {
        temp: number;
		humidity: number;
    };
};
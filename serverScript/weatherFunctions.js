module.exports = {

    WeatherConverter: function (weather) {
        switch (true) {
            case ((weather == null) || false):  // == (weather == null) || (weather == undefined) Webstorm lightbulb feature
                return " ";
            case(weather < 300):
                return "Gewitter";
            case (weather < 500):
                return "Nieselregen";
            case (weather < 600):
                return "Regen";
            case (weather < 700):
                return "Schnee";
            case (weather < 800):
                return "Nebel";
            case (weather === 800):
                return "Klarer Himmel";
            case (weather > 800):
                return "Bewölkt";
            default:
                return "error";
        }
    },

    WindDirection: function (windDirection) {
        switch (true) {
            case ((windDirection == null) || false):
                return " ";
            case (windDirection >= 348.75 && windDirection <= 360) || (windDirection >= 0 && windDirection < 11.25):
                return "N";
            case (windDirection >= 11.25 && windDirection < 33.75):
                return "NNO";
            case (windDirection >= 33.75 && windDirection < 56.25):
                return "NO";
            case (windDirection >= 56.25 && windDirection < 78.75):
                return "ONO";
            case (windDirection >= 78.75 && windDirection < 101.25):
                return "O";
            case (windDirection >= 101.25 && windDirection < 123.75):
                return "OSO";
            case (windDirection >= 123.75 && windDirection < 146.25):
                return "SO";
            case (windDirection >= 146.25 && windDirection < 168.75):
                return "SSO";
            case (windDirection >= 168.75 && windDirection < 191.25):
                return "S";
            case (windDirection >= 191.25 && windDirection < 213.75):
                return "SSW";
            case (windDirection >= 213.75 && windDirection < 236.25):
                return "SW";
            case (windDirection >= 236.25 && windDirection < 258.75):
                return "WSW";
            case (windDirection >= 258.75 && windDirection < 281.25):
                return "W";
            case (windDirection >= 281.25 && windDirection < 303.75):
                return "WNW";
            case (windDirection >= 303.75 && windDirection < 326.25):
                return "NW";
            case (windDirection >= 326.25 && windDirection < 348.75):
                return "NNW";
            default:
                return " ";
        }
    },

    WeatherIcon: function (weatherCode) {
        let weatherIcon;

        switch (true) {
            case ((weatherCode == null) || false):
                weatherIcon = "/img/question-square.svg";
                break;
            case (weatherCode < 300):
                weatherIcon = "/img/cloud-lightning-rain.svg";
                break;
            case (weatherCode < 500):
                weatherIcon = "/img/cloud-drizzle.svg";
                break;
            case (weatherCode < 600):
                weatherIcon = "/img/cloud-rain.svg";
                break;
            case (weatherCode < 700):
                weatherIcon = "/img/cloud-snow.svg";
                break;
            case (weatherCode < 800):
                weatherIcon = "/img/cloud-fog.svg";
                break;
            case (weatherCode === 800):
                weatherIcon = "/img/sunny.svg";
                break;
            case (weatherCode > 800):
                weatherIcon = "/img/cloud.svg";
                break;
            default:
                weatherIcon = "/img/question-square.svg";
        }
        return weatherIcon;
    },

    TemperatureIcon: function (temperature) {
        let temperatureIcon;

        switch (true) {
            case ((temperature == null) || false):
                temperatureIcon = "/img/question-square.svg";
                break;
            case ((temperature < 5) && (temperature >= -273.15)) :
                temperatureIcon = "/img/thermometer-snow.svg";
                break;
            case (temperature < 15):
                temperatureIcon = "/img/thermometer-low.svg";
                break;
            case (temperature < 25):
                temperatureIcon = "/img/thermometer-half.svg";
                break;
            case (temperature < 35):
                temperatureIcon = "/img/thermometer-high.svg";
                break;
            case (temperature >= 35):
                temperatureIcon = "/img/thermometer-sun.svg";
                break;
            default:
                temperatureIcon = "/img/question-square.svg";
        }
        return temperatureIcon;
    },

    Arrow: function (current, previous) {
        let arrow;
        current = parseFloat(current);
        previous = parseFloat(previous);

        switch (true) {
            case ((current == null) || false):
                arrow = "/img/question-square.svg";
                break;
            case (((previous == null) || false) && ((current !== null) || true)):
                arrow = "/img/arrow-right.svg";
                break;
            case (current < previous):
                arrow = "/img/arrow-down-right.svg";
                break;
            case (current > previous):
                arrow = "/img/arrow-up-right.svg";
                break;
            default:
                arrow = "/img/arrow-right.svg";
        }
        return arrow;
    }
}
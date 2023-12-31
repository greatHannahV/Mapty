'use strict';


let map, mapEvent;


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat,lng]
        this.distance = distance; //in km
        this.duration = duration; //in min

    }
    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
    click() {
        this.clicks++;
    }
}


class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();

        this._setDescription();


    }
    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace
    }

}
class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed()

        this._setDescription();


    }
    calcSpeed() {
        //km/h
        this.speed = this.distance / this.duration;
        return this.speed;
    }
}


////////////////////////////////
////////////////////////////////
//APLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    _map;
    _mapEvent;
    _workouts = [];
    _mapZoomLevel = 13;
    constructor() {
        //user positon
        this._getPosition();
        //get loc storage
        this._getLocalStorage();
        //attach event handkers
        form.addEventListener('submit', this._newWorkour.bind(this));
        //input events
        inputType.addEventListener('change', this._toggleElevatationField.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }


    _getPosition() {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            function() {
                alert('Could not get your position')
            }
        );

    }
    _loadMap(position) {

        const { latitude } = position.coords
        const { longitude } = position.coords
        const coords = [latitude, longitude]
            //map
        this._map = L.map('map').setView(coords, this._mapZoomLevel);
        // console.log(L);
        L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this._map);

        //handlig a click on the map
        this._map.on('click', this._showForm.bind(this));

        this._workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }
    _showForm(mapE) {

        this._mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm() {
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);

    }
    _toggleElevatationField() {

        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }
    _newWorkour(e) {
            const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
            const allPositive = (...inputs) => inputs.every(inp => inp > 0);
            e.preventDefault();
            //get a data from the form
            const type = inputType.value;
            const distance = +inputDistance.value;
            const duration = +inputDuration.value
            const { lat, lng } = this._mapEvent.latlng;
            let workout;

            //if run-g, create run object
            if (type === 'running') {
                const cadence = +inputCadence.value;
                //check if the data is valid
                if (
                    // (!Number.isFinite(distance)
                    // || !Number.isFinite(duration)
                    // || !Number.isFinite(cadence)
                    // )
                    !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                    return alert('Inputs have to be positive numbers!');

                workout = new Running([lat, lng], distance, duration, cadence);
            }
            //if cyc-g, create cyc object
            if (type === 'cycling') {
                const elevation = +inputElevation.value;
                if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                    return alert('Inputs have to be positive numbers!');

                workout = new Cycling([lat, lng], distance, duration, elevation);

            }
            //add a new obj to wotkout array
            this._workouts.push(workout);

            //render workout on the map as a marker
            this._renderWorkoutMarker(workout);

            //render workout on the list
            this._renderWorkout(workout);
            //hide+
            //clear inputs fields
            this._hideForm();
            //set local storage to all workouts
            this._setLocalStorage();
        }
        //display a marker

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this._map)

        //https://leafletjs.com/reference.html documentation
        .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${
                workout.type === 'running' ?'🏃‍♂️': '🚴‍♀️'
            } ${workout.description}`)
            .openPopup();
    }
    _renderWorkout(workout) {
        let html = `
       <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
                workout.type === 'running' ?'🏃‍♂️': '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;
        if (workout.type === 'running')
            html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        </li>
      `;
        if (workout.type === 'cycling')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
            `;
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this._workouts.find(work => work.id === workoutEl.dataset.id);
        this._map.setView(workout.coords, this._mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        });
        // Using the public interface
        // workout.click();
    }
    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this._workouts))
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'))
        if (!data) return;
        this._workouts = data;
        this._workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }
    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}


const app = new App();
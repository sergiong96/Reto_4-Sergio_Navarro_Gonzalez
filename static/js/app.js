//VARIABLES
let map = "";
let userMarker = "";
let newMarker = "";
let hasGeolocation = false;
let dateStart = 0;
let intervalUpdate = "";
const btnOpenDialog = document.querySelector("#panel #btnAdd");
const btnOpenHistory = document.querySelector("#panel #historial");
const historyAside = document.querySelector("aside#history");
const btnAddMarker = document.querySelector("#addModal button[data-action=add]");
const deleteBtn = document.querySelector("a>i.fa-solid.fa-trash-can");
const timeTarget = document.querySelector("#panel #infoMarcador input#tiempo");
const distanceTarget = document.querySelector("#panel #infoMarcador input#distancia");
const nombTarget = document.querySelector("#panel #infoMarcador input#nombre");
const templateHistory = document.querySelector("aside#history template#historyTemplate");
const cloneList = templateHistory.content.querySelector("ul").cloneNode(true);
const btnClear = document.querySelector("aside#history button[data-action=clear]");


//Comprobación del funcionamiento de la geolocalización en el navegador
if (navigator.geolocation) {
    hasGeolocation = true;
    initMap();
    followUser();
    asideHistory();
} else {
    window.location.href = "./views/error.html";
}


//EVENTOS
if (hasGeolocation) {

    btnAddMarker.addEventListener("click", (e) => {
        e.preventDefault();
        historyAside.classList.contains("active") ? historyAside.classList.remove("active") : "";
        addMarker();
        document.querySelector("#addModal button.btn-close").click();
    });

    deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        removeMarker();
    });

    btnOpenHistory.addEventListener("click", () => {
        historyAside.classList.toggle("active");
    });

    btnClear.addEventListener("click", () => {
        clearHistory();
    });

}



//FUNCIONES
//Genera el mapa inicial y añade un marcador con el icono personalizado
function initMap() {
    navigator.geolocation.getCurrentPosition((position) => {
        let lat = position.coords.latitude;
        let long = position.coords.longitude;

        //Marcador de mi posición actual según la latitud y longitutd dada por la API geolocation
        map = L.map('map').setView([lat, long], 18);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        let myIcon = L.icon({
            iconUrl: './static/icons/person.png',
            shadowUrl: './static/icons/person-shadow.png',
            iconSize: [50, 45], //ancho x alto
            shadowSize: [50, 40],
            iconAnchor: [25, 39],
            shadowAnchor: [10, 33]
        });
        userMarker = L.marker([lat, long], { icon: myIcon }).addTo(map);
    });

}


//Sigue al usuario conforme cambia su latitud y longitud
function followUser() {

    navigator.geolocation.watchPosition((position) => {
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        userMarker.setLatLng([lat, long]);
    });
}


//Actualiza el temporizador según la fecha en la que el usuario colocó el marcador y la fecha actual en tiempo real
function updateTime() {
    let dateUpdate = 0;
    let diferenceMili = 0;
    let diferenceSecs = 0;
    let diferenceSecsFormat = 0;
    let diferenceMin = "";
    let diferenceMinFormat = 0;
    let diferenceHour = "";

    let pointUser = 0;
    let pointCar = 0;
    let options = "";
    let distance = 0;


    intervalUpdate = setInterval(() => {
        if (newMarker) {
            dateUpdate = new Date();
            diferenceMili = dateUpdate - dateStart;

            diferenceSecs = Math.floor(diferenceMili / 1000);
            diferenceSecsFormat = (diferenceSecs % 60).toString().padStart(2, "0");

            diferenceMin = Math.floor(diferenceSecs / 60);
            diferenceMinFormat = (diferenceMin % 60).toString().padStart(2, "0");

            diferenceHour = Math.floor(diferenceMin / 60).toString().padStart(2, "0");

            timeTarget.value = `${diferenceHour}:${diferenceMinFormat}:${diferenceSecsFormat}`;

            pointUser = turf.point([userMarker.getLatLng().lat, userMarker.getLatLng().lng]);
            pointCar = turf.point([newMarker.getLatLng().lat, newMarker.getLatLng().lng]);

            options = { units: 'kilometers' };
            distance = turf.distance(pointUser, pointCar, options).toFixed(2);
            distanceTarget.value = `${distance}Km`;
        }

    }, 500);

}


//Añade un nuevo marcador
function addMarker() {
    let markerExists = false;
    dateStart = new Date();

    if (!newMarker) {
        drawMarker()
            .then(() => {
                updateTime();
                map.invalidateSize();
            });
    } else {
        //Si el usuario pulsa sobre añadir nuevo marcador cuando ya existía uno activo, se guarda
        //el marcador sobreescrito en el historial
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker && (layer.options.icon.options.iconUrl.match(/car.png/))) {
                markerExists = true;
            }
        });

        if (markerExists) {
            storageHistory()
                .then(() => {
                    addRegToHistory();

                    if (newMarker) {
                        newMarker.remove();
                        newMarker = null;
                    }

                    drawMarker()
                        .then(() => {
                            updateTime();
                            map.invalidateSize();
                        });

                });
        }
    }
}


//Dibuja un nuevo marcador tras resolver la promesa de la posición del usuario y le añade un popup
async function drawMarker() {
    let nombre = document.querySelector("#addModal input#nomb").value;
    nombTarget.value = nombre;

    return new Promise((resolve, reject) => {
        getLocation.then((position) => {
            let lat = position.coords.latitude;
            let long = position.coords.longitude;

            let carIcon = L.icon({
                iconUrl: './static/icons/car.png',
                iconSize: [65, 35],
                iconAnchor: [25, 19],
                popupAnchor: [5, -7]
            });

            newMarker = L.marker([lat, long], { icon: carIcon }).addTo(map);
            newMarker.bindPopup(nombre).openPopup();
            resolve(); //Se resuelve al dibujar el marcador con éxito
        });

    });

}

//Usando directamente getCurrentPosition no mostraba el marcador justo al pulsar sobre
//'Añadir marcador', por lo que envuelvo la promesa de getCurrentPosition en la variable getLocation y creo el marcador
//una vez que la promesa ha sido completada con éxito (.then al usar getLocation)
let getLocation = new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
});


//Elimina el marcador del coche
function removeMarker() {

    if (newMarker) {
        storageHistory()
            .then(() => {
                addRegToHistory();

                if (intervalUpdate) {
                    clearInterval(intervalUpdate);
                }

                newMarker.remove();
                newMarker = null;

                nombTarget.value = "";
                timeTarget.value = "";
                distanceTarget.value = "";

            });
    }
}


//Función asíncrona que guarda el último registro en el localStorage y devuelve una promesa, 
//de forma que, desde otras funciones, puedan usar .then para esperar a que esta función se resuelva
//antes de hacer gestiones sobre los registros
async function storageHistory() {

    let lastReg = {};
    let lastRegName = nombTarget.value;
    let lasrRegDistance = distanceTarget.value;
    let lastRegDuration = timeTarget.value;
    let contador;

    lastReg = {
        id: 0,
        nombre: lastRegName,
        distancia: lasrRegDistance,
        duracion: lastRegDuration,
        ubicacion: {}
    }


    contador = localStorage.getItem("contadorRegistros");
    if (!contador) {
        localStorage.setItem("contadorRegistros", parseInt(1));
        contador = localStorage.getItem("contadorRegistros");
    } else {
        contador++;
        localStorage.setItem("contadorRegistros", contador);
    }

    let latNom = newMarker.getLatLng().lat;
    let longNom = newMarker.getLatLng().lng;
    let url = `https://nominatim.openstreetmap.org/reverse?lat=${latNom}&lon=${longNom}&format=json`;

    return new Promise((resolve, reject) => {
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                locationString = {
                    calle: data.address.road,
                    ciudad: data.address.city,
                    codpost: data.address.postcode
                }

                lastReg.id = contador;
                lastReg.ubicacion = locationString;

                localStorage.setItem(`ultimoRegistro${contador}`, JSON.stringify(lastReg));
                resolve(); //Se resuelve al guardar el registro con éxito
            });
    });

}


//Añade el último registro a la lista del historial de ubicaciones
function addRegToHistory() {

    let newItem = document.createElement("li");
    let cantidadRegistros = localStorage.getItem("contadorRegistros");
    let lastReg = localStorage.getItem(`ultimoRegistro${cantidadRegistros}`);
    let lastRegParsed = JSON.parse(lastReg);

    let formatLocation = `${lastRegParsed.ubicacion.calle}. ${lastRegParsed.ubicacion.ciudad}, ${lastRegParsed.ubicacion.codpost}.`;

    newItem.innerHTML = `Id: ${lastRegParsed.id}. Etiqueta ${lastRegParsed.nombre}. Duración: ${lastRegParsed.duracion}. Ubicación: ${formatLocation}`;
    cloneList.appendChild(newItem);

}


//Crea el contenido del historial de ubicaciones en base al contenido del local storage al iniciar la aplicación
function asideHistory() {
    let newItem = "";
    let registro = "";
    let regsParsed = {};
    let formatLocation = "";
    let cantidadRegistros = localStorage.getItem("contadorRegistros");

    for (let i = 1; i <= cantidadRegistros; i++) {
        newItem = document.createElement("li");
        registro = localStorage.getItem(`ultimoRegistro${i}`);
        regsParsed = JSON.parse(registro);
        formatLocation = `${regsParsed.ubicacion.calle}. ${regsParsed.ubicacion.ciudad}, ${regsParsed.ubicacion.codpost}.`;
        newItem.innerHTML = `Id: ${regsParsed.id}. Etiqueta: ${regsParsed.nombre}. Duración: ${regsParsed.duracion}. Ubicación: ${formatLocation}`;
        cloneList.appendChild(newItem);
    }

    document.body.querySelector("aside").appendChild(cloneList);
}


//Limpia el localstorage y el historial de ubicaciones
function clearHistory() {
    let cantidadRegistros = localStorage.getItem("contadorRegistros");
    let nodeListArray = [];

    for (let i = 1; i <= cantidadRegistros; i++) {
        localStorage.removeItem(`ultimoRegistro${i}`);
    }

    localStorage.removeItem("contadorRegistros");

    nodeListArray = Array.from(cloneList.childNodes);
    nodeListArray.forEach((element) => {
        cloneList.removeChild(element);

    });

}

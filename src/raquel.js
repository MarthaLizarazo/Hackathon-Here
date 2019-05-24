const firebaseConfig = {
  apiKey: 'AIzaSyCEHjwe1uf5vF3gN-uSbQFsIv0ekmK0l-Y',
  authDomain: 'hackathon-here-3548e.firebaseapp.com',
  databaseURL: 'https://hackathon-here-3548e.firebaseio.com',
  projectId: 'hackathon-here-3548e',
  storageBucket: 'hackathon-here-3548e.appspot.com',
  messagingSenderId: '526305126761',
  appId: '1:526305126761:web:80ac7b73aec5835b'
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const platform = new H.service.Platform({
  app_id: 'aNF8XAILH0I6wrjlttyu',
  app_code: 'x5U_rooRVBrH10t0UyX4Sw'
});

document.getElementById('r-root').innerHTML = `
<div id="r-nav-bar">HISTORIAS</div>
<div id="r-here-map"></div>
      <div>
      <input type="text" id="texto"/>
        <input type="button" id="m-hablar" value="decir" />
        <input type="button" id="m-pausa" value="pause" />
      </div>
<div id="r-story"></div>
`;

try {
  var SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
} catch (e) {
  console.error(e);
  $('.no-browser-support').show();
  $('.app').hide();
}

document.getElementById('m-hablar').addEventListener('click', () => {
  decir(document.getElementById('texto').value);
  console.log('entre');
});

function decir(texto) {
  speechSynthesis.speak(new SpeechSynthesisUtterance(texto));
}

/*
texto.on('click', function(e) {
  recognition.stop();
  instructions.text('Reconocimiento Pausado.');
});*/

// Obtain the default map types from the platform object:
let defaultLayers = platform.createDefaultLayers();
let map;
// Instantiate (and display) a map object:
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    position => {
      currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      map = new H.Map(
        document.getElementById('r-here-map'),
        defaultLayers.normal.map,
        {
          zoom: 12.5,
          center: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }
      );
      let events = new H.mapevents.MapEvents(map);
      // eslint-disable-next-line
      let behavior = new H.mapevents.Behavior(events);
      // eslint-disable-next-line
      let ui = new H.ui.UI.createDefault(map, defaultLayers);
      let icon = new H.map.Icon('img/Ellipse.png');
      let marker = new H.map.Marker(currentPosition, { icon: icon });
      map.addObject(marker);
    },
    error => {
      map = new H.Map(
        document.getElementById('r-here-map'),
        defaultLayers.normal.map,
        {
          zoom: 10,
          center: { lat: 52.5, lng: 13.4 }
        }
      );
    }
  );
} else {
  map = new H.Map(
    document.getElementById('r-here-map'),
    defaultLayers.normal.map,
    {
      zoom: 10,
      center: { lat: 52.5, lng: 13.4 }
    }
  );
}

// filtrar historias que esten cerca del usuario
function getMeAStory(indice) {
  let stories;
  function getStories() {
    return new Promise((res, rej) => {
      firebase
        .database()
        .ref('stories')
        .on('value', snap => {
          stories = Object.values(snap.val());
          res(Object.values(snap.val()));
        });
    });
  }

  getStories()
    .then(data => {
      return new Promise(
        (res, rej) => {
          navigator.geolocation.getCurrentPosition(position => {
            console.log(
              'Ubicacion del usuario: ' +
                position.coords.latitude +
                ',' +
                position.coords.longitude
            );
            res([
              data,
              { lat: position.coords.latitude, lng: position.coords.longitude }
            ]);
          });
        },
        error => {
          rej(error);
        }
      );
    })
    .then(data => {
      console.log(data);
      let mapped = data[0].map(story => {
        return fetch(
          'https://route.api.here.com/routing/7.2/calculateroute.json?app_id=aNF8XAILH0I6wrjlttyu&app_code=x5U_rooRVBrH10t0UyX4Sw&waypoint0=geo!' +
            data[1].lat +
            ',' +
            data[1].lng +
            '&waypoint1=geo!' +
            story.startCoordinates.lat +
            ',' +
            story.startCoordinates.lng +
            '&mode=fastest;pedestrian;traffic:disabled'
        )
          .then(data => data.json())
          .then(data => {
            return data.response.route[0].summary;
          });
      });
      return Promise.all(mapped);
    })
    .then(data => {
      console.log(data);
      let distancedStories = [];
      for (let i = 0; i < data.length; i++) {
        distancedStories.push({
          ...stories[i],
          distance: data[i].distance,
          time: parseInt(data[i].baseTime / 60)
        });
      }
      return distancedStories;
    })
    .then(data => {
      console.log(data);
      let filtered = data.filter(story => {
        return story; /*.distance <= 2000*/
      });
      return filtered.sort((a, b) => {
        return a.distance - b.distance;
      });
    })
    .then(data => {
      console.log(data);
      let icon = new H.map.Icon('img/marker.png');
      let marker = new H.map.Marker(
        {
          lat: data[indice].startCoordinates.lat,
          lng: data[indice].startCoordinates.lng
        },

        { icon: icon }
      );
      map.addObject(marker);
      document.getElementById('r-story').innerHTML = `
        <div id="r-button">A ${data[indice].time} min de tí</div>
        <img id="r-story-img" src=${data[indice].img}>        
        <div id="r-title">${data[indice].title.toUpperCase()}</div>
        <img id="r-right-arrow" src="./img/arrowright.png">
        <img id="r-left-arrow" src="./img/arrowleft.png">
        <div id="r-info">
        <div id="r-address"><img id="r-location-minimarker" src="../img/minimarker2.png">DIRECCIÓN</div>
        <div id="r-genre">${data[indice].genre}</div>
        <div id="r-duration"><img src="./img/clock2.png" id="r-location-minimarker">${
          data[indice].duration
        }</div>
        <div id="r-summary">${data[indice].summary}</div>
        </div>
  
        
        
    


        </div>
        `;

      // <button id="m-hablar" class="m-audio" <img src="./img/audio.png"> </img> </button>

      document.getElementById('r-right-arrow').addEventListener('click', () => {
        if (data.length === indice + 1) {
          return;
        } else {
          map.removeObject(marker);
          getMeAStory(indice + 1);
        }
      });

      document.getElementById('r-left-arrow').addEventListener('click', () => {
        if (indice === 0) {
          return;
        } else {
          map.removeObject(marker);
          getMeAStory(indice - 1);
        }
      });
    })
    .catch(error => {
      console.log(error);
      alert(
        'Para que esta aplicación funcione correctamente necesitamos acceso a tu gelocalización'
      );
    });
}

getMeAStory(0);

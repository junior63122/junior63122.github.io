document.getElementById('enter-button').addEventListener('click', function() {
  document.getElementById('door').style.animation = "openDoor 2s ease-in-out forwards";
  document.getElementById('door-wrapper').style.display = "none";
  document.getElementById('room').style.display = "block";
});
var characters = [
  { name: "lee-lou", description: "", instagram: "https://www.instagram.com/leelgortina" },
  { name: "manon", description: "", instagram: "https://www.instagram.com/manon_figuccia" },
  { name: "estelle", description: "", instagram: "https://www.instagram.com/stlouuuu" },
  { name: "mazia", description: "", instagram: "https://www.instagram.com/mazia.nice" },
  { name: "mickaella", description: "", instagram: "https://www.instagram.com/mickaella_trl" },
  { name: "gaia", description: "", instagram: "https://www.instagram.com/gaia_cmb" },
  { name: "keti", description: "", instagram: "https://www.instagram.com/issakadze" },
  { name: "leane", description: "", instagram: "https://www.instagram.com/leane.vuletic" },
  { name: "junior", description: "", instagram: "https://www.instagram.com/junior_joyant" },
  { name: "deborah", description: "", instagram: "https://www.instagram.com/deborah.slg" },
  { name: "laurine", description: "", instagram: "https://www.instagram.com/laurine.drs" },
  { name: "chloe", description: "", instagram: "https://www.instagram.com/chloe_pantel" },
  { name: "indiana", description: "", instagram: "https://www.instagram.com/indiana.af" },
  { name: "aya", description: "", instagram: "https://www.instagram.com/aya_mira_kouhoub" },
  { name: "leina", description: "", instagram: "https://www.instagram.com/leina.cl" },
  { name: "melissa", description: "", instagram: "https://www.instagram.com/melissa_vgl" },
  { name: "lisa", description: "", instagram: "https://www.instagram.com/lisaafenich" },
  { name: "roxane", description: "", instagram: "https://www.instagram.com/roxxane.vrt" },
  { name: "crn", description: "", instagram: "https://www.instagram.com/crn_zkr" },
  { name: "chirine", description: "", instagram: "https://www.instagram.com/chirinekrn" },
  { name: "clss.p6", description: "", instagram: "https://www.instagram.com/clss.p6" }  
];

var charactersContainer = document.getElementById('characters');

// Create and add the characters to the room
characters.forEach(function(character, index) {
  var characterDiv = document.createElement('div');
  characterDiv.classList.add('character');
  characterDiv.innerHTML = `
    <img src="images/character${index+1}.jpg" alt="${character.name}">
    <h3 class="character-name">${character.name}</h3>
  `;
  characterDiv.addEventListener('click', function() {
    showCharacterPresentation(character);
  });
  charactersContainer.appendChild(characterDiv);
});

function showCharacterPresentation(character) {
  document.getElementById('character-name').textContent = character.name;
  document.getElementById('character-description').textContent = character.description;
  document.getElementById('instagram-link').href = character.instagram;
  document.getElementById('room').style.display = "none";
  document.getElementById('character-presentation').style.display = "block";
}

document.getElementById('exit-button').addEventListener('click', function() {
  document.getElementById('room').style.display = "block";
  document.getElementById('character-presentation').style.display = "none";
});

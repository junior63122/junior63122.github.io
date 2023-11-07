document.getElementById('enter-button').addEventListener('click', function() {
  document.getElementById('door').style.animation = "openDoor 2s ease-in-out forwards";
  document.getElementById('door-wrapper').style.display = "none";
  document.getElementById('room').style.display = "block";
});

// Define an array of characters with their names, descriptions, and Instagram links
var characters = [
  { name: "Character 1", description: "Description 1", instagram: "https://www.instagram.com/character1" },
  { name: "Character 2", description: "Description 2", instagram: "https://www.instagram.com/character2" },
  // Add more characters here...
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

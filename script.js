function startGame() {
	var startButton = document.querySelector('.start-button');
	var door = document.querySelector('.door');
	var charactersContainer = document.querySelector('.characters-container');
	
	startButton.style.display = 'none';
	door.style.display = 'block';
	
	setTimeout(function() {
		door.style.display = 'none';
		charactersContainer.style.visibility = 'visible';
	}, 2000);
}

function showCharacterInfo(characterName) {
	alert('Voici ' + characterName + '!');
}

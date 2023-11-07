document.getElementById('enter-button').addEventListener('click', function() {
  document.getElementById('door').style.animation = "openDoor 2s ease-in-out forwards";
  document.getElementById('door-wrapper').style.display = "none";
  document.getElementById('room').style.display = "block";
  this.style.display = "none"; // Hide the enter-button using 'this'
});
var characters = [
  { name: "lee-lou", description: "hello hello, enchanté ! moi c’est Lee-Lou, j’ai 21 ans et je viens d’arriver à Nice le mois dernier, c’est super cool d’avoir créé ce groupe !", instagram: "https://www.instagram.com/leelgortina" },
  { name: "manon", description: "Holaaa ! Bienvenue  ! Je m'appelle manon, je suis la maman star du groupe ahah ! J'ai 25 ans et j'ai grandis à saint roch et maintenant je vis vers Saint Laurent ! ps : je ne suis pas trés boite moi ahah", instagram: "https://www.instagram.com/manon_figuccia" },
  { name: "estelle", description: "Hello! Bienvenue ! Moi j’ai 26 ans et je suis sur nice depuis pas mal de temps mais j’aime bien faire de nouvelles rencontres (c’est hyper dur à Nice de se faire des amies et les gens sont faux la plupart du temps malheureusement) et je travaille en tant qu’agent d’escale à l’aéroport de Nice voilà :)", instagram: "https://www.instagram.com/stlouuuu" },
  { name: "mazia", description: "Saluttt !! Bienvenuuue  ! je m'appelle mazia et j'habite sur nice , je suis etudiante infirmière en 2 année ! J'adore rigoler et taquiner !! j'aime beaucoup les kdrama et les anime aussi ! ps : j'aimerais bien aller au marche de noel avec fous ahah .", instagram: "https://www.instagram.com/mazia.nice" },
  { name: "mickaella", description: "Coucou ! Bienvenue ! Moi c'est Mickaëlla j'ai 23 ans , et je suis de...  je ne sais pas encore ahah , mais avec mon copain on cherche un appartement. ps : ( peut etre vers frejus, mais ca l'avenir nous le dira )  ", instagram: "https://www.instagram.com/mickaella_trl" },
  { name: "gaia", description: "Coucou ! Bienvenue !! Moi c'est Gaia, j'ai 21 ans aussi et j'habite vers madeleine et je suis étudiante en langues ( je suis en master lea relation franco italiennes) ! ps : J'adore faire de nouvelle connaissance et j'aime bien les boites de nuits . Si vous voulez on peut se retrouver un jour à carlone et manger au RU ou boire un truc à la camionette, ça sera avec plaisir ☺️", instagram: "https://www.instagram.com/gaia_cmb" },
  { name: "keti", description: "Coucouuuu !!! Moi c'est keti, j'ai 21 ans et j'habite vers vauban . Cela fait  8 ans que je suis à nice . ", instagram: "https://www.instagram.com/issakadze" },
  { name: "leane", description: "Bonjour ! enchanté ! Moi c'est leane , je suis  à amos sport business school au campus des metiers ", instagram: "https://www.instagram.com/leane.vuletic" },
  { name: "junior", description: "Holàaaaaa, et enchanté !  Alors je ne suis pas une fille , mais je cherche des amis aussi ahah j’espère que je dérange paaas !! Promis l’amitié fille garçon ça existe mdrrr . Je suis de nice ,j'ai 21 ans et je suis étudiant en informatique et cybersécurité ! ps : J'adoreeeeeee les soirées donc si tu en as propose moi et direct je viens danser !!! OOOh et prend tout ce que je dis à la rigolade , je suis toujours dans la rigolade moi ahah .  j'aime beaucoup les kdrama et les animes ! ", instagram: "https://www.instagram.com/junior_joyant" },
  { name: "deborah", description: "", instagram: "https://www.instagram.com/deborah.slg" },
  { name: "laurine", description: "Hellooo ! Bienvenue ! Ducoup je me présente a mon tour ahah. Je m'appel laurine , j'ai 21 ans, je suis étudiante en psychologie à nice, je suis arrivé a nice il y a 2 ans .", instagram: "https://www.instagram.com/laurine.drs" },
  { name: "chloe", description: "Hey!! je m'appelle chloe ,  Je viens juste d’arrêter mais j’etais en info-com à carlone, j’etais en master j’ai pris une année sabatique. Mais du coup si des premières années sont là et on besoin de conseils n’hesitez pas mdr", instagram: "https://www.instagram.com/chloe_pantel" },
  { name: "indiana", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/indiana.af" },
  { name: "aya", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/aya_mira_kouhoub" },
  { name: "leina", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/leina.cl" },
  { name: "melissa", description: "Coucou !!! Bienvenue dans le groupe , je m'appelle Melissa, j'ai 21 ans et j'habite vers Saint Roch, je suis étudiante en architecture d’intérieur, je suis celle qui a crée ce groupe afin que l'on puisse rencontrer de nouvelles personnes sur nice ou aux alentours ! ", instagram: "https://www.instagram.com/melissa_vgl" },
  { name: "lisa", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/lisaafenich" },
  { name: "roxane", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/roxxane.vrt" },
  { name: "crn", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/crn_zkr" },
  { name: "chirine", description: "Saluut ! Bienvenue ! Ducoup je m’appelle chirine et j’ai 19 ans et je suis en L1 llce anglais au campus carlone. J’ai emménagé à nice en septembre 2023. j'aime beaucoup les kdrama et les animes ! ps : je sais pas qui m’a envoyé en llce 💀💀 ", instagram: "https://www.instagram.com/chirinekrn" },
  { name: "clss.p6", description: "je ne me suis pas présenté", instagram: "https://www.instagram.com/clss.p6" }  
];

var charactersContainer = document.getElementById('characters');

characters.forEach(function(character, index) {
  var characterDiv = document.createElement('div');
  characterDiv.classList.add('character');
  characterDiv.innerHTML = `
    <img src="https://github.com/junior63122/junior63122.github.io/blob/main/avatar-1577909_1280.png?raw=true" alt="${character.name}">
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

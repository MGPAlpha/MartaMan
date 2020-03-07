// Our Twitter library
var Twit = require('twit');

// We need to include our configuration file
var T = new Twit(require('./config.js'));

var phrases = [
	//TODO replace these with hangman phrases
	"Phrases go here"
];

var hangmanArt = [
`．．＿＿＿＿．
．｜．．．．｜
．．．．．．｜
．．．．．．｜
．．．．．．｜
．．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
．．．．．．｜
．．．．．．｜
．．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
．｜．．．．｜
．．．．．．｜
．．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
＜｜．．．．｜
．．．．．．｜
．．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
＜｜＞．．．｜
．．．．．．｜
．．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
＜｜＞．．．｜
．｜．．．．｜
．．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
＜｜＞．．．｜
．｜．．．．｜
｜．．．．．｜
＝＝＝＝＝＝＝`,
`．．＿＿＿＿．
．｜．．．．｜
．Ｏ．．．．｜
＜｜＞．．．｜
．｜．．．．｜
｜．｜．．．｜
＝＝＝＝＝＝＝`
];

class Game {
	constructor() {
		this._letters = new Map();
		for (var i = 10; i < 36; i++) {
			this._letters.set(i.toString(36), false);
		}

		this._phrase = phrases[Math.floor(Math.random() * phrases.length)];

		this._wrongGuesses = 0;

		// Meaning:
		// -3: Game over
		// -2: Guess could not be parsed
		// -1: Letter was already guessed
		// 0: Incorrect guess
		// 1: Correct guess
		// 2: Game won
		// undefined: no previous guess
		this._lastGuessResult = undefined;
	}

	// Checks if letter has been guessed, or true if not a letter character
	letterGuessed(letter) {
		if (letter.length != 1) {
			throw "Cannot parse " + letter + " as a letter";
		}
		if (!letter.match(/\W/ig) != 1) return true;

		// Check if the letter is true in the map
		else return this.letters.get(letter.toLowerCase());
	}

	// Processes the player's guess
	guess(letter) {
		// Make sure can read the letter
		if (letter.length != 1 || !letter.match(/\w/ig)) {
			this._lastGuessResult = -2;
		}

		// Make sure letter has not already been guessed
		if (this.letters.get(letter.toLowerCase())) {
			this._lastGuessResult = -1;
		} else {
			// Mark the letter as guessed
			this.letters.set(letter.toLowerCase(), true);

			// If guess is in the phrase
			if (this.phrase.toLowerCase().includes(letter.toLowerCase())) {
				this._lastGuessResult = 1;

				// Check if guess makes player win
				var won = true;
				for (var i = 0; i < this.phrase.length; i++) {
					if (!this.letterGuessed(this.phrase.charAt(i))) won = false;
				}
				if (won) {
					this._lastGuessResult = 2;
				}
			}
			// If guess not in the phrase
			else {
				this._lastGuessResult = 0;
				this._wrongGuesses++;

				// Check if guess makes player lose
				if (this.wrongGuesses >= hangmanArt.length - 1) {
					this._lastGuessResult = -3;
				}
			}
		}
	}

	// Returns a spaced string of all un-guessed letters
	writeAvailableLetters() {
		var available = [];
		for (var i = 10; i < 36; i++) {
			var letter = i.toString(36);
			if (!this.letters.get(letter)) available.push(letter);
		}
		return available.join(" ");
	}

	// Returns a spaced string of all un-guessed letters
	writeUsedLetters() {
		var used = [];
		for (var i = 10; i < 36; i++) {
			var letter = i.toString(36);
			if (this.letters.get(letter)) used.push(letter);
		}
		return used.join(" ");
	}

	// Writes the phrase, with unguessed letters replaced by '_'
	writePhrase() {
		var outArray = [];
		for (var i = 0; i < this.phrase.length; i++) {
			var letter = this.phrase.charAt(i);
			outArray.push(this.letterGuessed(letter) ? letter : "_");
		}
		return outArray.join(" ");
	}

	get letters() {
		return this._letters;
	}

	get phrase() {
		return this._phrase;
	}

	get wrongGuesses() {
		return this._wrongGuesses;
	}

	get lastGuessResult() {
		return this._lastGuessResult
	}
}

// Remembers the id of MartaMan's user to make sure it doesn't reply to itself over and over
var myId;

// Used to make sure two updates can't be called simultaneously
var occupied = false;

// Used to get just new mentions
var lastSeenMention;

function init() {
	occupied = true;

	// Gets and stores MartaMan's user id
	T.get('account/verify_credentials', (error, response) => {
		if (!error) {
			myId = response.id_str;
			console.log("My user id is " + myId);
		} else {
			console.log(error);
			process.exit();
		}
		completedInitTask();
	});

	// Gets and stores most recent mention id at init time
	T.get('statuses/mentions_timeline', {count: 1}, (error, data) => {
		if (!error) {
			lastSeenMention = data[0].id_str;
			console.log("Newest mention is id " + lastSeenMention);
		} else {
			console.log(error);
			process.exit();
		}
		completedInitTask();
	});
}

// Tracks when all init processes have finished
var initTasksCompleted = 0
var numInitTasks = 2;

function completedInitTask() {
	initTasksCompleted++;
	if (initTasksCompleted >= numInitTasks) {
		console.log("Initialized Bot");
		occupied = false;
		// Sets update to run every 15 seconds
		setInterval(update, 15000);
	}
}

var games = new Map();

function update() {
	// Make sure another update isn't already being run
	if (!occupied) {
		occupied = true;
		// Get all new mentions
		T.get('statuses/mentions_timeline', {since_id: lastSeenMention}, (error, data) => {
			if (!error) {

				// Loop through the list of new mentions
				data.forEach(element => {
					let userId = element.user.id_str;
					let repliedTo = [];
					// Make sure the mention isn't own tweet
					if (userId != myId && !repliedTo.includes(userId)) {

						var currGame;

						if (!games.has(userId)) {
							// Create game for new user
							currGame = new Game();
							games.set(userId, currGame);
						} else {
							// Otherwise process their guess
							currGame = games.get(userId);
							currGame.guess(element.text.replace(/@\w* */ig, "").trim().charAt(0));
						}

						var outputLines = [];

						// Make first statement based on previous guess
						switch(currGame.lastGuessResult) {
							case undefined:
								outputLines.push("Y OU HAVE SUMMONED MARTA MAN., COMMENCE GAME");
								break;
							case -3:
								outputLines.push("GAME OVER,.");
								break;
							case -2:
								outputLines.push("I CAN'T UNDERSTAND YOUR GUESS. TRY! AGAIN!");
								break;
							case -1:
								outputLines.push("Y OU ALREADY MADE THAT GUESS! TRY! AGAIN!");
								break;
							case 0:
								outputLines.push("INCORRECT. I SUF FER.");
								break;
							case 1:
								outputLines.push("CORRECT. MY STRENGTH GROWS,.");
								break;
							case 2:
								outputLines.push("A JUSTICE HAS BEEN DONE THIS DAY.,.");
								break;
						}

						// Display used letters
						outputLines.push(`Used letters: ${currGame.writeUsedLetters()}`);

						// Display current hangman
						outputLines.push(hangmanArt[currGame.wrongGuesses]);

						// Display phrase, with underscores replacing unguessed letters
						outputLines.push(currGame.writePhrase());

						// If game is over, delete the game
						if (currGame.lastGuessResult == -3 || currGame.lastGuessResult == 2) {
							games.delete(userId);
						}

						// Put all the output together with newlines
						var status = outputLines.join("\n").toUpperCase();

						// Post the game as a reply
						T.post('statuses/update', {
							status: status,
							in_reply_to_status_id: element.id_str,
							auto_populate_reply_metadata: true
						}, (error, response) => {
							if (error) {
								console.log("Error occurred in replying");
								console.log(error);
							}
						});

						// Mark user as already replied to on this update
						repliedTo.push(userId);

					}
				});
				// Update the last seen mention
				if (data.length != 0) {
					lastSeenMention = data[0].id_str;
				}
			} else {
				console.log(error);
			}
			occupied = false;
		});
	}
}

// Start the bot
init();

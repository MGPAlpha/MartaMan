// Our Twitter library
var Twit = require('twit');

// We need to include our configuration file
var T = new Twit(require('./config.js'));

var phrases = [
	//TODO replace these with hangman phrases
	"Phrases go here"
];

var hangmanArt = [
	"",
	"",
	"",
	"",
	""
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
		// -2: Guess could not be parsed
		// -1: Letter was already guessed
		// 0: Incorrect guess
		// 1: Correct guess
		// undefined: no previous guess
		this._lastGuessResult = undefined;
		
		// For the win state, 0 represents a game still running, -1 is lost, and 1 is won
		this._winState = 0;
	}

	letterGuessed(letter) {
		if (letter.length != 1) {
			throw "Cannot parse " + letter + " as a letter";
		}
		if (letter.match(/\W/g) != 1) return true;
		else return this.letters.get(letter);
	}

	guess(letter) {
		if (letter.length != 1 || !letter.match(/\w/)) {
			throw "Cannot guess " + letter + "";
			this._lastGuessResult = -2;
		}
		if (this.letters.get(letter.toLowerCase())) {
			this._lastGuessResult = -1;
		} else {
			this.letters.set(letter.toLowerCase(), true);
			if (this.phrase.includes(letter)) {
				this._lastGuessResult = 1;
				for (var i = 0; i < this.phrase.length; i++) {
					
				}
			} else {
				this._lastGuessResult = 0;
				this._wrongGuesses++;
				if (this.wrongGuesses >= hangmanArt.length) {
					this._winState = -1;
				}
			}
		}
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

	get winState() {
		return this._winState;
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
						
						if (!games.has(userId)) {
							// Post a reply tweet, with the same text
							var status = '\u25b8' + element.text.replace(/@[\w\d_]* ?/g, "") + '\u25c2';
							console.log(status);
							T.post('statuses/update', {
								status: status,
								in_reply_to_status_id: element.id_str,
								auto_populate_reply_metadata: true
							}, (error, response) => {
								if (error) {
									console.log("Error occurred in replying");
									console.log(error);
								} else {
									games.set(userId, new Game());
								}
							});
						} else {
							console.log(games.get(userId));
						}
						
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
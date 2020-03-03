// Our Twitter library
var Twit = require('twit');

// We need to include our configuration file
var T = new Twit(require('./config.js'));

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

function update() {
	// Make sure another update isn't already being run
	if (!occupied) {
		occupied = true;
		// Get all new mentions
		T.get('statuses/mentions_timeline', {since_id: lastSeenMention}, (error, data) => {
			if (!error) {
				// Loop through the list of new mentions
				data.forEach(element => {
					// Make sure the mention isn't own tweet
					if (element.user.id_str != myId) {
						// Post a reply tweet, with the same text minus the last character
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
							}
						});
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
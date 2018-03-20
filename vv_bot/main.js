steem.api.setOptions({ url: 'https://api.steemit.com' });

let voteQualifiers,
	voteIteration = Number(0),
	totalVotes = Number(0),
	totalIts = Number(0),
	totalErrs = Number(0),
	myAccount = String('guest123'),
	timerRef;

window.addEventListener('DOMContentLoaded', function () {
	
	document.getElementById('timerStarter').onclick = function() {
		document.getElementById('timerTrail').disabled = true;
		document.getElementById('timerStarter').disabled = true;
		document.getElementById('timerStarter').setAttribute('class', 'timerb_on');
		
		checkVotingPower();
		timerRef = setInterval(checkVotingPower, 55000); // 60000 = one minute
		
		document.getElementById('timerStarter').value = 'Feed Voting On';
		document.getElementById('timerStopper').disabled = false;
	};
	
	document.getElementById('timerTrail').onclick = function() {
		document.getElementById('timerStarter').disabled = true;
		document.getElementById('timerTrail').disabled = true;
		document.getElementById('timerTrail').setAttribute('class', 'timerb_on');
		
		startTrail(10000000000, []);
		timerRef = setInterval(startTrail, 60000, 10000000000, []);
		
		document.getElementById('timerTrail').value = 'Trailing On';
		document.getElementById('timerStopper').disabled = false;
	};
	
	document.getElementById('timerStopper').onclick = function() {
		document.getElementById('timerStopper').disabled = true;
		
		window.clearInterval(timerRef);
		
		document.getElementById('timerStarter').value = 'Feed Voting Off';
		document.getElementById('timerStarter').disabled = false;
		document.getElementById('timerStarter').setAttribute('class', 'timerb_off');
		
		document.getElementById('timerTrail').value = 'Trailing Off';
		document.getElementById('timerTrail').disabled = false;
		document.getElementById('timerTrail').setAttribute('class', 'timerb_off');
	};
	
	document.getElementById('AddBlacklist').onclick = function () {
		var blzoneRef = document.getElementById("BLzone");
		blzoneRef.insertAdjacentHTML('beforeend', '<input class="Blacklist" value=""></input><br><br>');
	}
	
	steem.api.getNextScheduledHardfork(function(err, result) {
		if (!err) {
			document.getElementById('Hfv').value = result.hf_version;
			document.getElementById('Hft').value = result.live_time;
		} else {
			errorHandler(err);
		}
	});
	
}, false);

function errorHandler(err) {
	totalErrs++;
	document.getElementById('TotalErrs').value = totalErrs;
	document.getElementById('Log').innerHTML = err;
	var staticErr = document.createTextNode(err),
		domErrLog = document.getElementById("ErrLog");
	domErrLog.appendChild(staticErr),
		domErrLog.insertAdjacentHTML('beforeend', '<br><br>');
}

function vpFormater(vp, vptime) {
	let lastVoteTime = new Date(vptime + 'Z'),
		nowDate = new Date,
		addedVP = Number(0);
	lastVoteTime = lastVoteTime.getTime();
	nowDate = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds(), nowDate.getUTCMilliseconds());
	addedVP = Number(((nowDate - lastVoteTime) * (20 / 86400)) / 10);
	return ((addedVP + vp) > 10000) ? 10000 : (addedVP + vp); // 10000 = 100.00%
}

function checkVotingPower() {
	totalIts++;
	document.getElementById('TotalIts').value = totalIts;
	
	steem.api.getAccounts([myAccount], function(err, result) {
		document.getElementById('TrueVPower').value = err ? 'getAccounts API error' : vpFormater(result[0].voting_power, result[0].last_vote_time);
		document.getElementById('VPower').value = err ? 'getAccounts API error' : result[0].voting_power;
		if (!err) {
			if (vpFormater(result[0].voting_power, result[0].last_vote_time) > document.getElementById('VPT').value) {
				document.getElementById('Log').innerHTML = JSON.stringify(result);
				
				let blackListArr = Array.from(document.getElementsByClassName('Blacklist'));
				blackListArr = blackListArr.map(function(elem) {
					return elem.value;
				});
				console.log('blackList:', blackListArr);
				getFollowingList('0', [], blackListArr);
			} else {
				document.getElementById('Log').innerHTML = 'Voting Power Below Threshold';
			}
		} else {
			errorHandler(err);
		}
	});
}

function getFollowingList(nextFollow, flistArg, blacklist) {
	var account = document.getElementById('Account').value;
	steem.api.getFollowing(account, nextFollow, null, 100, function(err, result) {
		if (!err) {
			document.getElementById('Log').innerHTML = JSON.stringify(result);
			let followsList = flistArg;
			
			for (let follows of result) {
				if (follows.what.length > 0 && follows.what[0] == 'blog') {
					followsList.push(follows.following);
				}
			}
			
			if (result.length == 100) {
				getFollowingList(result[result.length - 1].following, followsList, blacklist);
			} else {
				console.log('followsList:', followsList);
				processStates(followsList, blacklist);
			}
		} else {
			errorHandler(err);
		}
	});
}

function processStates(followsList, blacklist) {
	var accountFeed = String('/@' + document.getElementById('Account').value + '/feed');
	steem.api.getState(accountFeed, function(err, result) {
		if (!err) {
			voteQualifiers = [];
			let activeVotes = [],
				followsCrossRef = String(''),
				resteemCheck = false,
				postsDate,
				lowLimDate,
				upLimDate,
				nowDate;
			
			for (let post in result.content) {
				activeVotes = result.content[post].active_votes,
					activeVotes = activeVotes.map(function(voteObj) {
						return voteObj.voter;
					}),
					followsCrossRef = result.content[post].author,
					resteemCheck = false,
					postsDate = new Date(result.content[post].created + 'Z'),
					postsDate = postsDate.getTime(),
					lowLimDate = postsDate + (document.getElementById('LowLim').value * 60000), // minutes * amount of milliseconds in a minute
					upLimDate = postsDate + (document.getElementById('UpLim').value * 60000),
					nowDate = new Date,
					nowDate = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds(), nowDate.getUTCMilliseconds());
				
				if (document.getElementById('UpResteems').checked == false) {
					for (var i = 0; i < followsList.length; i++) {
						if (followsList[i] == followsCrossRef) {
							resteemCheck = true;
						}
					}
				} else {
					resteemCheck = true;
				}
				
				if (blacklist.indexOf(followsCrossRef) == -1 && activeVotes.indexOf(myAccount) == -1 && resteemCheck == true && nowDate >= lowLimDate && nowDate <= upLimDate) {
					voteQualifiers.push(post);
				}
			}
			document.getElementById('Log').innerHTML = voteQualifiers.length == 0 ? 'No posts to vote right now.' : voteQualifiers;
			
			voteIteration = Number(0);
			console.log('voteQualifiers:', voteQualifiers);
			votePosts(0);
			
		} else {
			errorHandler(err);
		}
	});
}

function votePosts(errBreak) {
	if (voteIteration != voteQualifiers.length && voteQualifiers.length != 0) {
		let splitterRef = voteQualifiers[voteIteration].split('/');
		steem.broadcast.vote('5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg', myAccount, splitterRef[0], splitterRef[1], 1000, function(err, result) {
			if (!err) {
				voteIteration++;
				totalVotes++;
				document.getElementById('TotalVotes').value = totalVotes;
				document.getElementById('Log').innerHTML = JSON.stringify(result);
				setTimeout(votePosts, 3200, 0);
			} else {
				errorHandler(err);
				errBreak++;
				if (errBreak >= 2) {
					voteIteration++;
					errBreak = 0;
				}
				setTimeout(votePosts, 3200, errBreak);
			}
		});
	}
}
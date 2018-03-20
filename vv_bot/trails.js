function startTrail(startIndex, preQualList) {
	steem.api.getAccountHistory(
		document.getElementById('TAccount').value, // Account name, as a string.
		startIndex, // From where to begin getting older entries.
		50, // Amount of entries to get prior to most recent/whatever start index you use.
		function (err, result) {
			if (!err) {
				let nowDate = new Date,
					opsDate;
				nowDate = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds(), nowDate.getUTCMilliseconds()) - (document.getElementById('TrailTime').value * 60000); // Minutes * milliseconds in a minute
				
				for (var i = result.length - 1; i >= 0; i--) {
					opsDate = new Date(result[i][1].timestamp + 'Z'),
						opsDate = opsDate.getTime();
					
					if (result[i][1].op[0] == 'vote' && result[i][1].op[1].voter == document.getElementById('TAccount').value && opsDate > nowDate) {
						preQualList.push(String(result[i][1].op[1].author + '/' + result[i][1].op[1].permlink));
					} else if (opsDate <= nowDate) {
						totalIts++;
						document.getElementById('TotalIts').value = totalIts;
						voteQualifiers = preQualList;
						voteIteration = Number(0);
						checkBlacklist();
						break;
					}
					if (i == 0 && opsDate > nowDate) {
						startTrail(result[i][0] - 1, preQualList);
					}
				}
			} else {
				errorHandler(err);
			}
		}
	);
}

function checkBlacklist() {
	let blackListArr = Array.from(document.getElementsByClassName('Blacklist'));
	blackListArr = blackListArr.map(function (elem) {
		return elem.value;
	});
	for (var i = 0; i < voteQualifiers.length; i++) {
		if (blackListArr.indexOf((voteQualifiers[i].split('/'))[0]) != -1) {
			voteQualifiers.splice(i, 1);
		}
	}
	checkVpPerVote(0);
}

function checkVpPerVote(errBreak) {
	steem.api.getAccounts(['guest123'], function(err, result) {
		document.getElementById('TrueVPower').value = err ? 'getAccounts API error' : vpFormater(result[0].voting_power, result[0].last_vote_time);
		document.getElementById('VPower').value = err ? 'getAccounts API error' : result[0].voting_power;
		if (!err) {
			if (vpFormater(result[0].voting_power, result[0].last_vote_time) > document.getElementById('VPT').value) {
				document.getElementById('Log').innerHTML = JSON.stringify(result);
				voteTrail(errBreak);
			} else {
				document.getElementById('Log').innerHTML = 'Voting Power Below Threshold';
			}
		} else {
			errorHandler(err);
		}
	});
}

function voteTrail(errBreak) {
	if (voteIteration != voteQualifiers.length && voteQualifiers.length != 0) {
		let splitterRef = voteQualifiers[voteIteration].split('/');
		steem.broadcast.vote('5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg', 'guest123', splitterRef[0], splitterRef[1], 1000, function (err, result) {
			if (!err) {
				voteIteration++;
				totalVotes++;
				document.getElementById('TotalVotes').value = totalVotes;
				document.getElementById('Log').innerHTML = JSON.stringify(result);
				setTimeout(checkVpPerVote, 3200, 0);
			} else {
				errorHandler(err);
				errBreak++;
				if (errBreak >= 2) {
					voteIteration++;
					errBreak = 0;
				}
				setTimeout(checkVpPerVote, 3200, errBreak);
			}
		});
	} else {
		document.getElementById('Log').innerHTML = 'No posts to vote right now.';
	}
}
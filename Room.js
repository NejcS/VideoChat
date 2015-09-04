module.exports = function (roomName, clientId, limit) {
    var data = {
        members: [],
        roomName: false,
        closed: false,
        limit: 2
    };

  	data.roomName = roomName;
  	data.members.push(clientId);
    if (limit) { data.limit = limit; }

    var join = function(clientId) {
        if (!data.closed) {
            data.members.push(clientId);
        } else {
            return false;
        }

        if (data.members.length >= data.limit) {
        	console.log('Locking the room after client: ' + clientId);
            this.lock();
        }

        return true;
    };

    var leave = function(clientId) {
        var index = data.members.indexOf(clientId);
       
        if (index) {
            data.members.splice(index, 1);
        }
    };

    var isEmpty = function () {
        if (data.members.length === 0) {
            return true;
        }
        return false;
    };

    var lock = function () {
		data.closed = true;
    };

    var listMembers = function() {
    	console.log(data.members);
    };

    var firstMember = function() {
        return data.members[0];
    };

    return {
    	lock: lock,
    	listMembers: listMembers,
    	isEmpty: isEmpty,
    	leave: leave,
    	join: join,
        firstMember: firstMember,
    };
};
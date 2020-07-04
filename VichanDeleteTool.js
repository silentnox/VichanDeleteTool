// ==UserScript==
// @name         Vichan Delete Tool
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       You
// @match        http://domain2.net/*
// @match        rfch.rocks/*
// @match        rfch.xyz/*
// @match        rfch.online/*
// @grant        none
// ==/UserScript==

(function() {
     'use strict';

     function log( text ) {
     	console.log(text);
     }

    if(!document.querySelector('.is-moderator')) {
        return;
    }

    if(document.querySelector('span.controls').innerHTML == '') {
        return;
    }

    var chkDeleteAll = document.querySelectorAll('input.delete');

    if(chkDeleteAll.length == 0) {
    	return;
    }

    function NumCheckboxSel() {
        return document.querySelectorAll('input.delete:checked').length;
    }

    var templ =
     `  <div id="DeleteForm" style="position: fixed; bottom: 20px; left: 20px; background-color: whitesmoke; border: 1px solid black; padding: 5px;">
            <div id="NumPosts" style="font-weight: bold">0 posts selected</div><div style="margin-top: 5px;">
                <button type="button" id="Delete">Delete</button>
                <button type="button" id="Move">Move</button>
                <button type="button" id="Reset">Reset</button>
            </div>
        </div>`;

    var el = document.createElement('div');
    el.innerHTML = templ;
    document.body.appendChild(el);
    el.style.display = "none";

    var btnDelete = el.querySelector('#Delete');
    var btnMove = el.querySelector('#Move');
    var btnReset = el.querySelector('#Reset');;
    var textCounter = el.querySelector('#NumPosts');

    function OnCheckboxClick() {
        var numCheckboxSelect = NumCheckboxSel();

    	textCounter.textContent = `${numCheckboxSelect} posts selected`;

        if(numCheckboxSelect == 0) {
            el.style.display = "none";
        }
        else {
            el.style.display = "block";
        }
    }

    function OnClickDeletePosts() {
        var sel = NumCheckboxSel();
    	if(sel == 0) {
    		alert("Nothing selected!");
    		return;
    	}
    	if(!confirm(`Delete ${sel} posts?`)) {
    		return;
    	}

    	function DeletePost( post ) {
            var checkbox = post.querySelector('input.delete');

            if(checkbox == null || checkbox.checked == false) {
                return;
            }

            var id = /\d+/.exec(post.id);
            //log("Deleting post: " + id);

            var del = post.querySelector(`[href$="delete/${id}"]`);

            if(del == null) {
                return;
            }

            var rawstr = del.outerHTML;
            //'?/rf/delete/33050/b1e982c0'
            //'\?\/rf\/delete\/33050\/(.*)'

            // we need to extract link with security token from javascript code inside element
            var regx = new RegExp("\\?/.*/delete/"+id+"/\\w+");
            var rmatch = regx.exec(rawstr);

            if(rmatch == null) {
                return;
            }

    		var xhttp = new XMLHttpRequest();
    		xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    log("Post " + id + " deleted");
                    //checkbox.checked = false;
                    checkbox.click();
                    checkbox.disabled = true;
                    post.disabled = true;
                    post.style.pointerEvents = 'none';
                    post.style.opacity = '0.7';
                }
            }
    	    xhttp.open("GET", rmatch, true);
    	    xhttp.send();

    	}

    	var post = document.querySelectorAll('.post');
    	post.forEach(DeletePost);
    }

    function OnClickMovePosts() {
        let sel = NumCheckboxSel();

        if(!sel) {
            alert("Nothing selected!");
            return;
        }

        let _prompt = prompt(`Select target location. Format: <board>/<thread>(optional). \nIf moving replies and thread is not specified, new thread is created.`);

        if( !_prompt ) {
            return;
        }

        let loc = /(\w+)(?:[\\|\/](\d+))?/.exec( _prompt );

        if(!loc[2]) {
            if(!confirm('Create new thread for selected replies?')) {
                return;
            }
        }

        let posts = Array.from( document.querySelectorAll('.post') );
        //posts.forEach(MovePost);

        posts = posts.filter( 
            function(post) {
                let checkbox = post.querySelector('input.delete');

                if(!checkbox || !checkbox.checked) return false;
                return true;
            }
        );

        function MovePost() {
            let post = posts.shift();

            if(!post) {
                return;
            }

            let checkbox = post.querySelector('input.delete');

            if(checkbox == null || checkbox.checked == false) {
                MovePost();
                return;
            }

            let id = /\d+/.exec(post.id);

            let moveLink = post.querySelector(`[href$="move_reply/${id}"],[href$="move/${id}"]`);

            if(!moveLink) {
                MovePost();
                return;
            }

            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if(this.status == 200) {
                        if(this.moveStage == 0) {
                            this.moveStage = 1;
                            let token = /<input type="hidden" name="token" value="(\w+)">/.exec(this.responseText)[1];
                            let formData = new FormData();
                            formData.append('token',token);
                            formData.append('target_thread',loc[2] ?? '');
                            formData.append('board',loc[1]);
                            xhttp.open("POST", moveLink, true);
                            xhttp.send(formData);
                        }
                        else {
                            log("Post " + id + " moved");
                            checkbox.click();
                            checkbox.disabled = true;
                            post.disabled = true;
                            post.style.pointerEvents = 'none';
                            post.style.opacity = '0.7';

                            if(!loc[2]) {
                                //let newThreadId = /(\w|[:\/_-]+)?\/(\w+)\/res\/(\d+)\/\.html.*/.exec(this.responseURL);
                                let newThreadId = /(\d+)\.html/.exec(this.responseURL)[1];

                                if(!newThreadId) return;

                                loc[2] = newThreadId;
                            }

                            MovePost();
                        }
                    }
                    else {
                        //MovePost();
                        return;
                    }
                }
            }

            xhttp.moveStage = 0;

            xhttp.open("GET", moveLink, true);
            xhttp.send();
        }

        MovePost();
    }

    function OnClickReset() {
    	var chkDeleteSel = document.querySelectorAll('input.delete:checked');
        chkDeleteSel.forEach((chk)=> {chk.click()});
        el.style.display = "none";
    }

    btnDelete.onclick   = OnClickDeletePosts;
    btnMove.onclick     = OnClickMovePosts;
    btnReset.onclick    = OnClickReset;

    chkDeleteAll.forEach((chk)=> {chk.onclick = OnCheckboxClick;});

})();
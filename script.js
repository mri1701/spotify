console.log("Let's write Javascript");

let currentSong = new Audio();
let songs = [];
let currentSongIndex = 0;
let currfolder;


/* =========================================================
   FORMAT TIME
   ========================================================= */

function secondsToMinutesSeconds(seconds) {

    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


/* =========================================================
   GET SONGS
   ========================================================= */

async function getSongs(folder) {

    currfolder = folder;

    const manifestUrl = new URL(`${folder}/info.json`, document.baseURI);
    let response = await fetch(manifestUrl);

    if (!response.ok) {
        throw new Error(
            `Could not load playlist manifest ${manifestUrl.href} (HTTP ${response.status})`
        );
    }

    const playlist = await response.json();

    if (!Array.isArray(playlist.songs)) {
        throw new Error(`Playlist manifest ${manifestUrl.href} must include a songs array`);
    }

    return playlist.songs.map((filename) => new URL(filename, manifestUrl).href);
}


/* =========================================================
   GET SONG NAME
   ========================================================= */

function getSongName(track) {

    return decodeURIComponent(track)
        .replaceAll("\\", "/")
        .split("/")
        .pop();
}


/* =========================================================
   PLAY MUSIC
   ========================================================= */

function playMusic(track, pause = false) {

    currentSong.src = track;

    let index = songs.indexOf(track);

    if (index !== -1) {
        currentSongIndex = index;
    }

    let songName = getSongName(track);

    document.querySelector(".songinfo").innerHTML = songName;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
    document.querySelector(".circle").style.left = "0%";

    if (!pause) {
        currentSong.play();
    }
}


/* =========================================================
   DISPLAY SONGS IN LIBRARY
   ========================================================= */

function displaySongs() {

    const songUL = document.querySelector(".songList ul");

    if (!songUL) {
        console.error(".songList ul was not found");
        return;
    }

    songUL.innerHTML = "";

    for (const song of songs) {

        const name = getSongName(song);

        const li = document.createElement("li");

        li.dataset.songUrl = song;

        li.innerHTML = `
            <img class="invert" src="${new URL("music.svg", document.baseURI).href}" alt="">

            <div class="info">
                <div>${name}</div>
                <div>Song Artist</div>
            </div>

            <div class="playnow">
                <span>Play</span>
                <img class="invert" src="${new URL("play.svg", document.baseURI).href}" alt="">
            </div>
        `;

        songUL.appendChild(li);
    }

    /* Song click events */

    document.querySelectorAll(".songList li").forEach((item) => {

        item.addEventListener("click", () => {

            const songUrl = item.dataset.songUrl;

            if (songUrl) {
                playMusic(songUrl);
            }
        });
    });
}


/* =========================================================
   LOAD PLAYLIST
   ========================================================= */

async function loadPlaylist(folder, autoplay = true) {

    try {

        console.log("Loading playlist:", folder);

        songs = await getSongs(folder);

        console.log("SONGS FOUND:", songs);

        if (!songs.length) {

            console.error(
                `No MP3 files found in /${folder}/`
            );

            return;
        }

        currentSongIndex = 0;

        displaySongs();

        playMusic(
            songs[currentSongIndex],
            !autoplay
        );

    } catch (error) {

        console.error(
            "ERROR LOADING PLAYLIST:",
            error
        );
    }
}


/* =========================================================
   DISPLAY ALBUMS / CARDS
   ========================================================= */
async function displayAlbums() {

    const cardContainer = document.querySelector(".cardContainor");

    if (!cardContainer) {
        console.error(".cardContainor not found");
        return;
    }

    try {

        const response = await fetch(new URL("songs/", document.baseURI));

        if (!response.ok) {
            throw new Error(`Could not open /songs/`);
        }

        const text = await response.text();

        const div = document.createElement("div");
        div.innerHTML = text;

        const anchors = Array.from(div.querySelectorAll("a"));

        let cardsHTML = "";

        for (const anchor of anchors) {

            const url = new URL(anchor.href, window.location.origin);

            const match = url.pathname.match(
                /^\/songs\/([^/]+)\/?$/
            );

            if (!match) {
                continue;
            }

            const folder = match[1];

            let title = folder;
            let description = "Songs for you";

            try {

                const infoResponse =
                    await fetch(new URL(`songs/${folder}/info.json`, document.baseURI));

                if (infoResponse.ok) {

                    const info =
                        await infoResponse.json();

                    title = info.title || folder;
                    description =
                        info.description || "Songs for you";
                }

            } catch (error) {
                console.log(
                    `Could not load info.json for ${folder}`
                );
            }

            cardsHTML += `
                <div class="card" data-folder="songs/${folder}">

                    <div class="play">
                        <!-- play icon -->
                    </div>

                    <img
                        src="${new URL(`songs/${folder}/cover.jpg`, document.baseURI).href}"
                        alt="${title}"
                    >

                    <h2>${title}</h2>

                    <p>${description}</p>

                </div>
            `;
        }

        cardContainer.innerHTML = cardsHTML;

        console.log(
            "Cards created:",
            cardContainer.querySelectorAll(".card").length
        );

    } catch (error) {

        console.error("ERROR DISPLAYING ALBUMS:", error);
    }
}

/* =========================================================
   MAIN
   ========================================================= */

async function main() {

    try {

        /* INITIAL PLAYLIST */
        await loadPlaylist("songs/ncs", false);


        /* =================================================
           PLAY / PAUSE
           ================================================= */

        const playButton =
            document.querySelector("#play");

        if (playButton) {

            playButton.addEventListener(
                "click",
                () => {

                    if (currentSong.paused) {
                        currentSong.play();
                    } else {
                        currentSong.pause();
                    }
                }
            );
        }


        /* =================================================
           PLAY EVENT
           ================================================= */

        currentSong.addEventListener(
            "play",
            () => {

                if (playButton) {
                    playButton.src = "pause.svg";
                }
            }
        );


        /* =================================================
           PAUSE EVENT
           ================================================= */

        currentSong.addEventListener(
            "pause",
            () => {

                if (playButton) {
                    playButton.src = "play.svg";
                }
            }
        );


        /* =================================================
           TIME UPDATE
           ================================================= */

        currentSong.addEventListener(
            "timeupdate",
            () => {

                if (!isNaN(currentSong.duration)) {

                    document.querySelector(
                        ".songtime"
                    ).innerHTML =
                        `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;

                    const percent =
                        (
                            currentSong.currentTime /
                            currentSong.duration
                        ) * 100;

                    document.querySelector(
                        ".circle"
                    ).style.left =
                        percent + "%";
                }
            }
        );


        /* =================================================
           SONG ENDED
           ================================================= */

        currentSong.addEventListener(
            "ended",
            () => {

                if (
                    currentSongIndex <
                    songs.length - 1
                ) {

                    currentSongIndex++;

                    playMusic(
                        songs[currentSongIndex]
                    );

                } else {

                    currentSongIndex = 0;

                    playMusic(
                        songs[currentSongIndex],
                        true
                    );

                    document.querySelector(
                        ".circle"
                    ).style.left = "0%";
                }
            }
        );


        /* =================================================
           SEEKBAR
           ================================================= */

        const seekbar =
            document.querySelector(".seekbar");

        if (seekbar) {

            seekbar.addEventListener(
                "click",
                (event) => {

                    if (
                        isNaN(
                            currentSong.duration
                        )
                    ) {
                        return;
                    }

                    const rect =
                        seekbar.getBoundingClientRect();

                    let percent =
                        (
                            event.clientX -
                            rect.left
                        ) / rect.width;

                    percent =
                        Math.max(
                            0,
                            Math.min(1, percent)
                        );

                    currentSong.currentTime =
                        currentSong.duration *
                        percent;

                    document.querySelector(
                        ".circle"
                    ).style.left =
                        (percent * 100) + "%";
                }
            );
        }


        /* =================================================
           PREVIOUS
           ================================================= */

        const previousButton =
            document.querySelector(
                "#previous"
            );

        if (previousButton) {

            previousButton.addEventListener(
                "click",
                () => {

                    if (currentSongIndex > 0) {

                        currentSongIndex--;

                        playMusic(
                            songs[currentSongIndex]
                        );
                    }
                }
            );
        }


        /* =================================================
           NEXT
           ================================================= */

        const nextButton =
            document.querySelector("#next");

        if (nextButton) {

            nextButton.addEventListener(
                "click",
                () => {

                    if (
                        currentSongIndex <
                        songs.length - 1
                    ) {

                        currentSongIndex++;

                        playMusic(
                            songs[currentSongIndex]
                        );
                    }
                }
            );
        }


        /* =================================================
           VOLUME
           ================================================= */

        const volumeRange =
            document.querySelector("#range");

        if (volumeRange) {

            currentSong.volume =
                parseFloat(
                    volumeRange.value
                );

            volumeRange.addEventListener(
                "input",
                (e) => {

                    currentSong.volume =
                        parseFloat(
                            e.target.value
                        );
                }
            );
        }


        /* =================================================
           PLAYLIST CARD CLICK
           ================================================= */

        /*
            IMPORTANT:
            Cards are created dynamically by displayAlbums(),
            so we use event delegation on .cardContainor.
        */

        const cardContainer =
            document.querySelector(
                ".cardContainor"
            );

        if (cardContainer) {

            cardContainer.addEventListener(
                "click",
                async (event) => {

                    const card =
                        event.target.closest(
                            ".card"
                        );

                    if (!card) {
                        return;
                    }

                    const folder =
                        card.dataset.folder;

                    if (!folder) {

                        console.error(
                            "Card has no data-folder."
                        );

                        return;
                    }

                    console.log(
                        "Card clicked:",
                        folder
                    );

                    await loadPlaylist(
                        folder,
                        true
                    );
                }
            );
        }


        /* =================================================
           HAMBURGER
           ================================================= */

        const hamburger =
            document.querySelector(
                ".hamburger"
            );

        const close =
            document.querySelector(
                ".close"
            );

        const left =
            document.querySelector(
                ".left"
            );


        if (hamburger && left) {

            hamburger.addEventListener(
                "click",
                () => {

                    left.classList.add(
                        "active"
                    );
                }
            );
        }


        /* =================================================
           CLOSE
           ================================================= */

        if (close && left) {

            close.addEventListener(
                "click",
                () => {

                    left.classList.remove(
                        "active"
                    );
                }
            );
        }


        console.log(
            "Music player initialized successfully."
        );

    } catch (error) {

        console.error(
            "MAIN ERROR:",
            error
        );
    }

    //event listener to mute the track
    // Volume control + mute/unmute

    const volumeRange = document.querySelector("#range");
    const volumeIcon = document.querySelector(".volume img");

    let previousVolume = 1;

    if (volumeRange && volumeIcon) {

        currentSong.volume = parseFloat(volumeRange.value);

        // Manual volume slider
        volumeRange.addEventListener("input", (e) => {

            const volume = parseFloat(e.target.value);

            currentSong.volume = volume;

            if (volume === 0) {
                currentSong.muted = true;
                volumeIcon.src = "mute.svg";
            } else {
                currentSong.muted = false;
                volumeIcon.src = "volume.svg";
                previousVolume = volume;
            }
        });

        // Click volume icon
        volumeIcon.addEventListener("click", () => {

            if (currentSong.muted || currentSong.volume === 0) {

                currentSong.muted = false;

                currentSong.volume =
                    previousVolume > 0 ? previousVolume : 1;

                volumeRange.value = currentSong.volume;

                volumeIcon.src = "volume.svg";

            } else {

                previousVolume = currentSong.volume;

                currentSong.muted = true;
                currentSong.volume = 0;

                volumeRange.value = 0;

                volumeIcon.src = "mute.svg";
            }
        });
    }
}


/* =========================================================
   START
   ========================================================= */

main();

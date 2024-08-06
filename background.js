// background.js

// number of actors to get per movie, increasing this will make the bot win much more quickly
const MAX_NUM_ACTORS_PER_MOVIE = 5;

// number of the movies to get per actor, increasing this will make the bot win much more quickly
const MAX_NUM_MOVIES_PER_ACTOR = 5;

// Define the minimum delay in milliseconds to ensure no more than 30 queries per second
const min_delay_ms = 1000 / 30; // Approximately 33.33 milliseconds
let last_send = 0;

// Function to wait for the minimum delay
async function wait_for_min_delay() {
    "use strict";
    const current_time = Date.now();
    const wait_time = last_send + min_delay_ms - current_time;

    if (wait_time > 0) {
        await new Promise(resolve => setTimeout(resolve, wait_time));
    }

    last_send = Date.now();
}

// Example usage of the wait_for_min_delay function
async function makeApiRequest() {
    await wait_for_min_delay();
    // Your API request logic here
    console.log("API request made at:", new Date());
}

// Example of making multiple API requests with delay
async function makeMultipleRequests() {
    for (let i = 0; i < 5; i++) {
        await makeApiRequest();
    }
}

// Start making multiple API requests
makeMultipleRequests();

const tmdb_api_key = "a24fddbf829a6ee340e3e54ae822b709"; // Replace with your actual TMDB API key

async function getMovieData(title, year) {
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1&year=${encodeURIComponent(year)}&api_key=${tmdb_api_key}`;
    console.log(`Request Movie Info for ${title} ${year}`);
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json'
        }
    };
    wait_for_min_delay();
    let response = await fetch(url, options);
    return response.json();
}

async function getMovieCredits(id) {
    const url = `https://api.themoviedb.org/3/movie/${id}/credits?language=en-US&api_key=${tmdb_api_key}`;
    console.log(`Request Movie credits for ${id}`);
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json'
        }
    };
    wait_for_min_delay();
    let response = await fetch(url, options);
    return response.json();
}

async function getActorMovieCredits(id) {
    const url = `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${tmdb_api_key}`;
    console.log(`Request Movie credits For Actor Id ${id}`);
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json'
        }
    };
    wait_for_min_delay();
    let response = await fetch(url, options);
    return response.json();
}

// Define the actorSaved function
async function actorSaved(name) {
  let actor_result = await chrome.storage.local.get([name]);

  if (typeof actor_result[name] === 'undefined') {
      console.log(`No results for actor ${name}`);
      return false;
  } else {
      return true;
  }
}

// Example usage of actorSaved function
// This is just an example, you can call this function based on your specific requirements
chrome.runtime.onInstalled.addListener(async () => {
  let actorName = "Leonardo DiCaprio"; // Replace with the actor name you want to check
  let exists = await actorSaved(actorName);
  if (exists) {
      console.log(`Actor ${actorName} exists in local storage.`);
  } else {
      console.log(`Actor ${actorName} does not exist in local storage.`);
  }
});

async function processMovie(message) {
  if (message.type === "movie") {
      let title = message.title;
      let year = message.year;
      let local_id = message.local_id;
      let movie_data = await getMovieData(title, year);
      console.log("Movie Data:");
      console.log(movie_data);

      // Prevent using foreign movies
      if (movie_data.original_language !== "en") {
        console.log("Skipping foreign movie:", movie_data.title);
        return null; // Skip processing this movie
    }

      
      // Extract only the necessary information
      let optimized_data = {
          id: movie_data.id,
          title: movie_data.title,
          popularity: movie_data.popularity,
          homepage: movie_data.homepage,
          imdb_id: movie_data.imdb_id,
          origin_country: movie_data.origin_country,
          original_title: movie_data.original_title,
          production_companies: movie_data.production_companies
      };

      console.log("Optimized Movie Data:");
      console.log(optimized_data);

      
       // Get movie credits
       let credits = await getMovieCredits(movie_data.id);
       let cast = credits.cast;

       // Sort and keep only top ten actors based on popularity
       let sorted_cast = cast.sort((a, b) => b.popularity - a.popularity);
       let most_popular_cast = sorted_cast.slice(0, Math.min(sorted_cast.length, 10));

       // Clean out actors to save only useful info
       most_popular_cast = most_popular_cast.map(actor => {
           return {
               id: actor.id,
               name: actor.name,
               popularity: actor.popularity
           };
       });

       // Save in movie data
       optimized_data.cast = most_popular_cast;
       optimized_data.year = year;

       // Now loop through actors and get their most popular movies
       let most_popular_cast_clone = structuredClone(most_popular_cast);
       for (let actor of most_popular_cast_clone) {
           console.log(actor.name);
           if (await actorSaved(actor.name)) {
               continue;
           } else {
               let actor_credits = await getActorMovieCredits(actor.id);
               let cast_credits = actor_credits.cast;

               // Sort and keep their most popular movies
               let sorted_cast_credits = cast_credits.sort((a, b) => b.popularity - a.popularity);
               let most_popular_credited = sorted_cast_credits.slice(0, Math.min(sorted_cast_credits.length, 10));

               // Clean out actor movie results
               most_popular_credited = most_popular_credited.map(credit => {
                   return {
                       id: credit.id,
                       title: credit.title,
                       popularity: credit.popularity,
                       release_date: credit.release_date
                   };
               });

               actor.credited = most_popular_credited;
           }
       }

       // Save the actor data
       for (let actor of most_popular_cast_clone) {
           let set_actor = {};
           set_actor[`${actor.name}`] = actor;
           await chrome.storage.local.set(set_actor);
       }

       // Save the movie data
       let set_movie = {};
       set_movie[`${local_id}`] = optimized_data;
       console.log(`Setting key ${local_id}`);
       console.log(optimized_data);
       await chrome.storage.local.set(set_movie);
   }
}

// Listener for incoming messages
chrome.runtime.onMessage.addListener(async function(message, sender, senderResponse) {
   console.log("Received message:");
   console.log(message);
   let optimized_data = await processMovie(message);
   senderResponse(optimized_data);
});
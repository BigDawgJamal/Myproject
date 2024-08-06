// tmdb.js
import { MovieDb } from 'themoviedb-javascript-library';

const API_KEY = 'a24fddbf829a6ee340e3e54ae822b709';
const tmdb = new MovieDb(API_KEY);

async function getMovieDetails(movieId) {
  return new Promise((resolve, reject) => {
    tmdb.movieInfo({ id: movieId }, (data) => {
      resolve(JSON.parse(data));
    }, (error) => {
      reject(error);
    });
  });
}

async function searchMovies(query) {
  return new Promise((resolve, reject) => {
    tmdb.searchMovie({ query }, (data) => {
      resolve(JSON.parse(data).results);
    }, (error) => {
      reject(error);
    });
  });
}

export { getMovieDetails, searchMovies };

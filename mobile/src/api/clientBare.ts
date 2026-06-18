// Bare axios instance without auth header — used for the login call
// (which is the only unauthenticated endpoint we hit regularly).
import axios from 'axios';
import { env } from '../config/env';

export const axiosBare = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

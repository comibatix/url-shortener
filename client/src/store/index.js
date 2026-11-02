import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import linksReducer from './linksSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    links: linksReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});
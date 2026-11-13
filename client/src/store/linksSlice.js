import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getLinks, createLink, deleteLink, getLinkStats, getLinkClicks } from '../api';

export const fetchLinks = createAsyncThunk(
  'links/fetchLinks',
  async (searchQuery = '', { rejectWithValue }) => {
    try {
      const url = searchQuery ? `/api/links?search=${encodeURIComponent(searchQuery)}` : '/api/links';
      const data = await getLinks(url);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addLink = createAsyncThunk(
  'links/addLink',
  async ({ originalUrl, customCode, expiresIn }, { rejectWithValue }) => {
    try {
      const data = await createLink(originalUrl, customCode, expiresIn);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeLink = createAsyncThunk(
  'links/removeLink',
  async (id, { rejectWithValue }) => {
    try {
      await deleteLink(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLinkStats = createAsyncThunk(
  'links/fetchLinkStats',
  async (shortCode, { rejectWithValue }) => {
    try {
      const data = await getLinkStats(shortCode);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

//  Thunk для получения истории кликов
export const fetchLinkClicks = createAsyncThunk(
  'links/fetchLinkClicks',
  async ({ shortCode, page, limit }, { rejectWithValue }) => {
    try {
      const data = await getLinkClicks(shortCode, page, limit);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const linksSlice = createSlice({
  name: 'links',
  initialState: {
    links: [],
    currentLink: null,
    currentStats: null,
    clickHistory: null, 
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentLink: (state) => {
      state.currentLink = null;
    },
    clearCurrentStats: (state) => {
      state.currentStats = null;
    },
    clearClickHistory: (state) => { 
      state.clickHistory = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearLinks: (state) => {
      state.links = [];
      state.currentLink = null;
      state.currentStats = null;
      state.clickHistory = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLinks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLinks.fulfilled, (state, action) => { state.loading = false; state.links = action.payload; })
      .addCase(fetchLinks.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      
      .addCase(addLink.fulfilled, (state, action) => { state.currentLink = action.payload; })
      
      .addCase(removeLink.fulfilled, (state, action) => { 
        state.links = state.links.filter(link => link._id !== action.payload); 
      })
      
      .addCase(fetchLinkStats.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLinkStats.fulfilled, (state, action) => { state.loading = false; state.currentStats = action.payload; })
      .addCase(fetchLinkStats.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      // Обработка истории кликов
      .addCase(fetchLinkClicks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchLinkClicks.fulfilled, (state, action) => { state.loading = false; state.clickHistory = action.payload; })
      .addCase(fetchLinkClicks.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearCurrentLink, clearCurrentStats, clearClickHistory, clearError, clearLinks } = linksSlice.actions;
export default linksSlice.reducer;
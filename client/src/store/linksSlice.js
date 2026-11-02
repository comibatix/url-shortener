import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getLinks, createLink, deleteLink, getLinkStats } from '../api';

export const fetchLinks = createAsyncThunk('links/fetchLinks', async (search, { rejectWithValue }) => {
  try {
    const url = search ? `/api/links?search=${encodeURIComponent(search)}` : '/api/links';
    const data = await getLinks(url);
    return data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const addLink = createAsyncThunk('links/addLink', async ({ originalUrl, customCode, expiresIn }, { rejectWithValue }) => {
  try {
    const data = await createLink(originalUrl, customCode, expiresIn);
    return data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const removeLink = createAsyncThunk('links/removeLink', async (shortCode, { rejectWithValue }) => {
  try {
    await deleteLink(shortCode);
    return shortCode;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchLinkStats = createAsyncThunk('links/fetchLinkStats', async (shortCode, { rejectWithValue }) => {
  try {
    const data = await getLinkStats(shortCode);
    return data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const linksSlice = createSlice({
  name: 'links',
  initialState: {
    links: [],
    currentLink: null,
    currentStats: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentLink: (state) => {
      state.currentLink = null;
    },
    clearCurrentStats: (state) => {
      state.currentStats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLinks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLinks.fulfilled, (state, action) => {
        state.loading = false;
        state.links = action.payload;
      })
      .addCase(fetchLinks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLink.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLink = action.payload;
        state.links.unshift(action.payload);
      })
      .addCase(addLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(removeLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeLink.fulfilled, (state, action) => {
        state.loading = false;
        state.links = state.links.filter(l => l.shortCode !== action.payload);
      })
      .addCase(removeLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLinkStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLinkStats.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStats = action.payload;
      })
      .addCase(fetchLinkStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentLink, clearCurrentStats } = linksSlice.actions;
export default linksSlice.reducer;
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getLinks, createLink, deleteLink, getLinkStats } from '../api';

// Async thunk для получения списка ссылок
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

// Async thunk для создания ссылки
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

// Async thunk для удаления ссылки
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

// Async thunk для получения статистики
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

const linksSlice = createSlice({
  name: 'links',
  initialState: {
    links: [],
    currentLink: null,
    currentStats: null, // ✅ Добавлено для статистики
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentLink: (state) => {
      state.currentLink = null;
    },
    clearCurrentStats: (state) => {
      state.currentStats = null; // ✅ Очищает статистику при переходе
    },
    clearError: (state) => {
      state.error = null;
    },
    clearLinks: (state) => {
      state.links = [];
      state.currentLink = null;
      state.currentStats = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchLinks
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
      // addLink
      .addCase(addLink.fulfilled, (state, action) => {
        state.currentLink = action.payload;
      })
      // removeLink
      .addCase(removeLink.fulfilled, (state, action) => {
        state.links = state.links.filter(link => link._id !== action.payload);
      })
      // fetchLinkStats
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

// ✅ Экспортируем ВСЕ действия, включая clearCurrentStats и clearLinks
export const { clearCurrentLink, clearCurrentStats, clearError, clearLinks } = linksSlice.actions;

export default linksSlice.reducer;
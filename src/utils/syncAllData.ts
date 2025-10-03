import axios from 'axios';

// Script to sync all data from RapidAPI to database
const syncAllData = async () => {
  try {
    const baseUrl = 'http://localhost:5000/api';
    
    console.log('Starting data sync process...');
    
    // Sync teams
    console.log('Syncing teams...');
    try {
      const teamsResponse = await axios.post(`${baseUrl}/teams/sync`);
      console.log('Teams sync result:', teamsResponse.data);
    } catch (error: any) {
      console.error('Error syncing teams:', error.message);
    }
    
    // Sync news
    console.log('Syncing news...');
    try {
      const newsResponse = await axios.post(`${baseUrl}/news/sync`);
      console.log('News sync result:', newsResponse.data);
    } catch (error: any) {
      console.error('Error syncing news:', error.message);
    }
    
    // Sync recent matches
    console.log('Syncing recent matches...');
    try {
      const recentMatchesResponse = await axios.post(`${baseUrl}/matches/sync-recent`);
      console.log('Recent matches sync result:', recentMatchesResponse.data);
    } catch (error: any) {
      console.error('Error syncing recent matches:', error.message);
    }
    
    // Sync upcoming matches
    console.log('Syncing upcoming matches...');
    try {
      const upcomingMatchesResponse = await axios.post(`${baseUrl}/matches/sync-upcoming`);
      console.log('Upcoming matches sync result:', upcomingMatchesResponse.data);
    } catch (error: any) {
      console.error('Error syncing upcoming matches:', error.message);
    }
    
    // Sync series
    console.log('Syncing series...');
    try {
      const seriesResponse = await axios.post(`${baseUrl}/series/sync`);
      console.log('Series sync result:', seriesResponse.data);
    } catch (error: any) {
      console.error('Error syncing series:', error.message);
    }
    
    console.log('Data sync process completed.');
  } catch (error: any) {
    console.error('Error in syncAllData:', error.message);
  }
};

// Run the sync process
syncAllData();
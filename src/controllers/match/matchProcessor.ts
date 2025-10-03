// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'UPCOMING';

  // Convert to lowercase for case-insensitive comparison
  const lowerStatus = status.toLowerCase();

  // Map LIVE status patterns
  if (lowerStatus.includes('live') ||
    lowerStatus.includes('in progress') ||
    lowerStatus.includes('innings break') ||
    lowerStatus.includes('rain delay') ||
    lowerStatus.includes('tea break') ||
    lowerStatus.includes('lunch break') ||
    lowerStatus.includes('drinks break') ||
    lowerStatus === 'live') {
    return 'LIVE';
  }

  // Map COMPLETED status patterns
  if (lowerStatus.includes('complete') ||
    lowerStatus.includes('finished') ||
    lowerStatus.includes('won by') ||
    lowerStatus.includes('match tied') ||
    lowerStatus.includes('no result') ||
    lowerStatus.includes('result') ||
    lowerStatus === 'completed' ||
    lowerStatus === 'finished') {
    return 'COMPLETED';
  }

  // Map ABANDONED status patterns
  if (lowerStatus.includes('abandon') ||
    lowerStatus.includes('washed out') ||
    lowerStatus === 'abandoned') {
    return 'ABANDONED';
  }

  // Map CANCELLED status patterns
  if (lowerStatus.includes('cancel') ||
    lowerStatus.includes('postponed') ||
    lowerStatus === 'cancelled') {
    return 'CANCELLED';
  }

  // Map UPCOMING status patterns
  if (lowerStatus.includes('match starts') ||
    lowerStatus.includes('starts at') ||
    lowerStatus.includes('upcoming') ||
    lowerStatus.includes('scheduled') ||
    lowerStatus.includes('preview') ||
    lowerStatus === 'upcoming' ||
    lowerStatus === 'scheduled') {
    return 'UPCOMING';
  }

  // If we can't determine the status, try to make an educated guess
  // Check if it contains time information (likely upcoming)
  if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
    return 'UPCOMING';
  }

  // Default fallback
  return 'UPCOMING';
};

// Helper function to process and save a single match
export async function processAndSaveMatch(m: any) {
  const Match = (await import('../../models/Match')).default;

  const matchId = m.matchInfo?.matchId || m.matchId || m.id || m.match_id || JSON.stringify(m).slice(0, 40);

  // Extract series information
  const seriesName = m.matchInfo?.seriesName || m.series?.name || m.tournament || 'Unknown Series';
  const seriesId = m.matchInfo?.seriesId || m.series?.id || m.tournamentId || '0';

  // Extract team information
  const team1Info = m.matchInfo?.team1 || m.teamA || m.team1 || {};
  const team2Info = m.matchInfo?.team2 || m.teamB || m.team2 || {};

  const team1Name = team1Info.teamName || team1Info.teamSName || team1Info.name || 'Team 1';
  const team2Name = team2Info.teamName || team2Info.teamSName || team2Info.name || 'Team 2';
  const team1Id = team1Info.teamId || team1Info.id || '1';
  const team2Id = team2Info.teamId || team2Info.id || '2';

  // Extract format and status
  const format = m.matchInfo?.matchFormat || m.matchInfo?.matchType || m.format || m.type || m.matchType || 'Other';
  const title = m.matchInfo?.matchDesc || m.title || m.name || `${team1Name} vs ${team2Name}`;
  const rawStatus = m.matchInfo?.status || m.matchInfo?.state || m.status || m.matchStatus || 'LIVE';
  const status = mapStatusToEnum(rawStatus);

  // Extract venue information
  const venueName = m.matchInfo?.venueInfo?.ground || m.matchInfo?.venue || m.venue?.name || m.venue || 'Venue TBD';
  const venueCity = m.matchInfo?.venueInfo?.city || m.venue?.city || '';
  const venueCountry = m.matchInfo?.venueInfo?.country || m.venue?.country || '';

  // Extract date information
  let startDate = null;
  if (m.matchInfo?.startDate) startDate = new Date(parseInt(m.matchInfo.startDate));
  else if (m.startDate) startDate = new Date(m.startDate);
  else if (m.date) startDate = new Date(m.date);

  // Extract score information
  const innings = m.matchScore?.scoreData || m.innings || m.matchScore || [];

  // Create teams array in the expected format
  const teams = [
    {
      teamId: team1Id.toString(),
      teamName: team1Name,
      teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
      score: {
        runs: innings[0]?.runs || innings.inngs1?.runs || 0,
        wickets: innings[0]?.wickets || innings.inngs1?.wickets || 0,
        overs: innings[0]?.overs || innings.inngs1?.overs || 0,
        balls: innings[0]?.balls || innings.inngs1?.balls || 0,
        runRate: innings[0]?.runRate || innings.inngs1?.runRate || 0
      }
    },
    {
      teamId: team2Id.toString(),
      teamName: team2Name,
      teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
      score: {
        runs: innings[1]?.runs || innings.inngs2?.runs || 0,
        wickets: innings[1]?.wickets || innings.inngs2?.wickets || 0,
        overs: innings[1]?.overs || innings.inngs2?.overs || 0,
        balls: innings[1]?.balls || innings.inngs2?.balls || 0,
        runRate: innings[1]?.runRate || innings.inngs2?.runRate || 0
      }
    }
  ];

  const doc: any = {
    matchId: matchId?.toString(),
    format: format || 'Other',
    title,
    shortTitle: m.matchInfo?.shortDesc || title,
    series: {
      id: seriesId.toString(),
      name: seriesName,
      seriesType: 'INTERNATIONAL' // Default value
    },
    teams,
    status,
    venue: {
      name: venueName,
      city: venueCity,
      country: venueCountry
    },
    startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
    isLive: true,
    raw: m
  };

  Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

  return Match.findOneAndUpdate(
    { matchId: doc.matchId },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
import catchify from "catchify";
export interface LeagueData {
  count: Number;
  filters: Object;
  competition: Object;
  season: Object;
  teams: [TeamData];
}
export interface TeamData {
  id: Number;
  area: Object;
  name: String;
  shortName: String;
  tla: String;
  crestUrl: String;
  address: String;
  phone: String;
  website: String;
  email: String;
  founded: Number;
  clubColors: String;
  venue: String;
  lastUpdated: String;
  squad?: [];
}

export default async function fetchCompetitionData(leagueId, api) {
  let [_leagueDataError, leagueData] = await catchify(
    api.getbyId("/competitions", leagueId, "/teams")
  );
  if (_leagueDataError) throw _leagueDataError;

  return leagueData;
}

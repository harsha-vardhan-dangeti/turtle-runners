/** The slices of Strava's API this app actually reads. */

/** Raw activity from GET /athlete/activities. */
export interface StravaActivity {
  id: number;
  name: string;
  /** Metres. */
  distance: number;
  /** Seconds, excluding time the athlete was stopped. */
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  /** e.g. 'Run', 'Ride', 'Swim', 'VirtualRide'. */
  sport_type?: string;
  /** Older field, kept because some activities still only carry this. */
  type?: string;
  /** ISO timestamp already shifted into the athlete's local timezone. */
  start_date_local: string;
  average_speed?: number;
  /** [lat, lng] where the activity began. Absent on manual or indoor entries. */
  start_latlng?: [number, number] | null;
  private?: boolean;
}

/** One sport's rollup inside GET /athletes/{id}/stats. */
export interface StravaTotals {
  count: number;
  distance: number;
  moving_time: number;
  elevation_gain: number;
}

export interface StravaAthleteStats {
  ytd_run_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_swim_totals: StravaTotals;
  biggest_ride_distance: number | null;
  biggest_climb_elevation_gain: number | null;
}

/** A shoe or a bike from GET /athlete. */
export interface StravaGear {
  id: string;
  name: string;
  /** Metres. */
  distance: number;
  primary: boolean;
}

export interface StravaAthlete {
  id: number;
  firstname: string | null;
  lastname: string | null;
  profile: string | null;
  shoes?: StravaGear[];
  bikes?: StravaGear[];
}

/** Token payload from both the code exchange and the refresh call. */
export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Unix seconds. */
  expires_at: number;
  athlete?: StravaAthlete;
}

// ---------------------------------------------------------------------------
// App-facing shapes. Nothing below carries a token.
// ---------------------------------------------------------------------------

/** What the dashboard is allowed to know about a connection. */
export interface StravaConnectionSummary {
  athleteId: number;
  athleteName: string | null;
  athleteAvatar: string | null;
  lastSyncedAt: string | null;
  connectedAt: string;
}

export interface StravaGearSummary {
  id: string;
  name: string;
  km: number;
  primary: boolean;
  kind: 'shoes' | 'bike';
}

export interface StravaSportTotals {
  count: number;
  km: number;
  hours: number;
}

export interface StravaOverview {
  connection: StravaConnectionSummary;
  ytd: { run: StravaSportTotals; bike: StravaSportTotals; swim: StravaSportTotals };
  allTime: { run: StravaSportTotals; bike: StravaSportTotals; swim: StravaSportTotals };
  /** Genuine Strava records. Locally derived bests live on the session rows. */
  records: { biggestRideKm: number | null; biggestClimbM: number | null };
  gear: StravaGearSummary[];
}

export interface StravaSyncResult {
  imported: number;
  updated: number;
  skipped: number;
}

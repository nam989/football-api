// import type { Team } from "@prisma/client";
import { Competition } from "@prisma/client";
import * as footballData from "./football-data.resolver";
import * as scalars from "./scalars";

export default {
  ...scalars,
  BaseModel: {
    __resolveType: (parent: any) => {
      if (parent.code) {
        return "Competition";
      }
      if (parent.tla) {
        return "Team";
      }
      if (parent.position) {
        return "Player";
      }
    },
  },
  Query: {
    team: footballData.findTeam,
    players: footballData.findPlayers,
  },
  Mutation: {
    migrateData: footballData.migrateData,
  },
};

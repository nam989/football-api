import { PrismaClient, Player, Team } from "@prisma/client";
import fetchCompetitionData from "../services/fetchData";
import { AxiosInstance } from "axios";
import catchify from "catchify";

export interface GqlResponse {
  msg: string;
  data: string | any[] | null;
}

export type ResolverParent = unknown;
export type ResolverContext = { orm: PrismaClient; api: AxiosInstance };
export type data = { id: string };

export async function findTeam(
  parent: ResolverParent,
  args: { name: string },
  context: ResolverContext
): Promise<Team | null> {
  return context.orm.team.findFirst({
    where: {
      name: args.name,
    },
    include: {
      players: true,
    },
  });
}

export async function findPlayers(
  parent: ResolverParent,
  args: { leagueCode: string; teamName: string },
  context: ResolverContext
): Promise<Player[] | null> {
  return context.orm.player.findMany({
    where: {
      teams: {
        some: {
          ...(args.teamName && { name: args.teamName }),
          competitions: {
            some: {
              code: args.leagueCode,
            },
          },
        },
      },
    },
  });
}

export async function migrateData(
  parent: ResolverParent,
  { id }: data,
  { orm, api }: ResolverContext
): Promise<GqlResponse> {
  //Search the competition data on API
  const [_getLeaguesAndTeamsDataError, getLeaguesAndTeamsData] = await catchify(
    fetchCompetitionData(id, api)
  );

  if (_getLeaguesAndTeamsDataError)
    return {
      msg: "Error fetching data",
      data: JSON.stringify(_getLeaguesAndTeamsDataError),
    };

  const f_competition = {
    id: getLeaguesAndTeamsData.competition.id,
    code: getLeaguesAndTeamsData.competition.code,
    name: getLeaguesAndTeamsData.competition.name,
  };

  //Create or update competition
  const [_createOrUpdateCompetitionError, createOrUpdateCompetition] =
    await catchify(
      orm.competition.upsert({
        where: {
          code: id,
        },
        create: {
          ...f_competition,
        },
        update: {
          ...f_competition,
        },
      })
    );
  if (_createOrUpdateCompetitionError)
    return {
      msg: "Upsert Error",
      data: JSON.stringify(_getLeaguesAndTeamsDataError),
    };

  //Prepare teams and players for create or update
  const { teams } = getLeaguesAndTeamsData;
  const upsertTeamsAndPlayers: any = teams.map((teamData: any) => {
    let players = teamData?.squad || [];
    if (players.length) {
      players = players.map((playerData: any) => {
        return {
          where: {
            id: playerData.id,
          },
          create: {
            id: playerData.id,
            name: playerData.name,
            position: playerData.position || "",
            dateOfBirth: new Date(playerData.dateOfBirth) || null,
            nationality: playerData.nationality || "",
          },
        };
      });
    } else {
      //Replacing player for coach
      teamData?.coach?.id &&
        players.push({
          where: {
            id: teamData.coach.id,
          },
          create: {
            id: parseInt(`999${teamData.coach.id}`), //Adding 999 to id for collisions prevention
            name: teamData.coach.name || "",
            position: "coach",
            dateOfBirth: new Date(teamData.coach.dateOfBirth) || null,
            nationality: teamData.coach.nationality || "",
          },
        });
    }
    return {
      where: {
        id: teamData.id,
      },
      create: {
        id: teamData.id,
        name: teamData.name,
        tla: teamData.tla,
        shortName: teamData.shortName || "",
        areaName: teamData.area?.areaName || "",
        address: teamData.address || "",
        players: { connectOrCreate: [...players] },
      },
    };
  });

  const [_createOrUpdateCompetitionDataError, createOrUpdateCompetitionData] =
    await catchify(
      orm.competition.update({
        where: {
          id: f_competition.id,
        },
        data: {
          teams: {
            connectOrCreate: [...upsertTeamsAndPlayers],
          },
        },
      })
    );

  if (_createOrUpdateCompetitionDataError)
    return {
      msg: "Creating competitions error",
      data: JSON.stringify(_createOrUpdateCompetitionDataError),
    };
  return { msg: "Competition created succesfully", data: null };
}

import path from "path";
import { readFileSync } from "fs";
import { PrismaClient, Player, Team, Competition } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import { DeepMockProxy } from "jest-mock-extended";
import EasyGraphQLTester from "easygraphql-tester";

import { ResolverContext } from "../resolvers/football-data.resolver";
import resolvers from "../resolvers";

const schema = readFileSync(path.join(__dirname, "../schema.graphql"), "utf8");

const tester = new EasyGraphQLTester(schema, resolvers);

export type MockResolverContext = {
  orm: DeepMockProxy<PrismaClient>;
  player: Player | undefined;
  team: Team | undefined;
  competition: Competition | undefined;
};
export const createMockContext = (): MockResolverContext => {
  return {
    orm: mockDeep<PrismaClient>(),
    player: undefined,
  } as any;
};

let mockContext: MockResolverContext;
let context: ResolverContext;

beforeEach(() => {
  mockContext = createMockContext();
  context = mockContext as unknown as ResolverContext;
});

const mockPlayers: Player[] = [
  {
    id: 6,
    name: "Géronimo Rulli",
    position: "Goalkeeper",
    dateOfBirth: new Date("706320000000"),
    nationality: "Argentina",
    createdAt: new Date("1692854337320"),
  },
  {
    id: 217028,
    name: "Billy Kirkman",
    position: "",
    dateOfBirth: new Date("1077753600000"),
    nationality: "England",
    createdAt: new Date("1692854337320"),
  },
];

const mockTeam: Team = {
  id: 3929,
  createdAt: new Date("2023-08-28T08:18:53.884Z"),
  name: "Royale Union Saint-Gilloise",
  tla: "USG",
  shortName: "Union SG",
  areaName: "",
  address: "Chaussée de Bruxelles, 223 Forest 1190",
};

const mockCompetition: Competition = {
  id: 2001,
  createdAt: new Date("1693210733844"),
  code: "CL",
  name: "UEFA Champions League",
};

jest.mock<typeof import("../services/fetchData")>(
  "../services/fetchData",
  (): any => {
    return jest.fn(() => ({
      competition: {
        id: 2001,
        createdAt: new Date("1693210733844"),
        code: "CL",
        name: "UEFA Champions League",
      },
      teams: [
        {
          id: 3929,
          createdAt: new Date("2023-08-28T08:18:53.884Z"),
          name: "Royale Union Saint-Gilloise",
          tla: "USG",
          shortName: "Union SG",
          areaName: "",
          address: "Chaussée de Bruxelles, 223 Forest 1190",
        },
      ],
    }));
  }
);

test("should return a list of players", async () => {
  mockContext.orm.player.findMany.mockResolvedValue(mockPlayers);

  const query = `
  query TEST($leagueCode: String!) {
      players(leagueCode: $leagueCode) {
        id
        name
        position
      }
    }
  `;

  const result = await tester.graphql(query, undefined, context, {
    leagueCode: "CL",
  });

  expect(result.data).toEqual({
    players: [
      {
        id: "6",
        name: "Géronimo Rulli",
        position: "Goalkeeper",
      },
      {
        id: "217028",
        name: "Billy Kirkman",
        position: "",
      },
    ],
  });
});

test("should return a team", async () => {
  mockContext.orm.team.findFirst.mockResolvedValue(mockTeam);

  const query = `
  query TEST($name: String!) {
    team(name: $name) {
      id
      createdAt
      name
      tla
      shortName
      areaName
      }
  }
  `;

  const result = await tester.graphql(query, undefined, context, {
    name: "Royale Union Saint-Gilloise",
  });
  expect(result.data).toEqual({
    team: {
      id: "3929",
      createdAt: "2023-08-28T08:18:53.884Z",
      name: "Royale Union Saint-Gilloise",
      tla: "USG",
      shortName: "Union SG",
      areaName: "",
    },
  });
});

test("should return success message", async () => {
  mockContext.orm.competition.update.mockResolvedValue(mockCompetition);
  mockContext.orm.competition.upsert.mockResolvedValue(mockCompetition);

  const query = `
  mutation TEST($migrateDataId: String!) {
    migrateData(id: $migrateDataId) {
      msg
      details
    }
  }
  `;

  const result = await tester.graphql(query, undefined, context, {
    migrateDataId: "CL",
  });
  expect(result.data).toEqual({
    migrateData: {
      msg: "Competition created succesfully",
      details: null,
    },
  });
});

test("should return Upsert Error message", async () => {
  mockContext.orm.competition.update.mockResolvedValue(mockCompetition);
  mockContext.orm.competition.upsert.mockRejectedValue(
    new Error("Bad operation")
  );

  const query = `
  mutation TEST($migrateDataId: String!) {
    migrateData(id: $migrateDataId) {
      msg
      details
    }
  }
  `;

  const result = await tester.graphql(query, undefined, context, {
    migrateDataId: "CL",
  });
  expect(result.data.migrateData.msg).toEqual("Upsert Error");
});

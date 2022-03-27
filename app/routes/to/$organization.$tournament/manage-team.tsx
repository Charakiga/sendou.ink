import { Prisma } from ".prisma/client";
import {
  ActionFunction,
  json,
  LinksFunction,
  LoaderFunction,
  redirect,
  useActionData,
  useLoaderData,
  useLocation,
} from "remix";
import { z } from "zod";
import { AddPlayers } from "~/components/AddPlayers";
import { Alert } from "~/components/Alert";
import { Catcher } from "~/components/Catcher";
import { TeamRoster } from "~/components/tournament/TeamRoster";
import { TOURNAMENT_TEAM_ROSTER_MAX_SIZE } from "~/constants";
import { tournamentURL } from "~/core/tournament/utils";
import {
  isCaptainOfTheTeam,
  teamHasNotCheckedIn,
  tournamentTeamIsNotFull,
} from "~/core/tournament/validators";
import * as Tournament from "~/models/Tournament.server";
import * as TournamentTeam from "~/models/TournamentTeam.server";
import * as TournamentTeamMember from "~/models/TournamentTeamMember.server";
import type { FindManyByTrustReceiverId } from "~/models/TrustRelationship.server";
import * as User from "~/models/User.server";
import styles from "~/styles/tournament-manage-team.css";
import { parseRequestFormData, requireUser, validate } from "~/utils";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

const actionSchema = z.union([
  z.object({
    _action: z.literal("ADD_PLAYER"),
    userId: z.string().uuid(),
    teamId: z.string().uuid(),
  }),
  z.object({
    _action: z.literal("DELETE_PLAYER"),
    userId: z.string().uuid(),
    teamId: z.string().uuid(),
  }),
]);

type ActionData = {
  error?: { userId?: string };
  ok?: z.infer<typeof actionSchema>["_action"];
};

export const action: ActionFunction = async ({
  request,
  context,
}): Promise<ActionData> => {
  const data = await parseRequestFormData({
    request,
    schema: actionSchema,
  });
  const user = requireUser(context);

  switch (data._action) {
    case "ADD_PLAYER": {
      try {
        const tournamentTeam = await TournamentTeam.findById(data.teamId);

        // TODO: Validate if tournament already started / concluded (depending on if tournament allows mid-event roster additions)
        validate(tournamentTeam, "Invalid tournament team id");
        validate(tournamentTeamIsNotFull(tournamentTeam), "Team is full");
        validate(
          isCaptainOfTheTeam(user, tournamentTeam),
          "Not captain of the team"
        );

        await TournamentTeamMember.joinTeam({
          tournamentId: tournamentTeam.tournament.id,
          teamId: data.teamId,
          memberId: data.userId,
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002" && e.message.includes("`tournamentId`")) {
            return {
              error: { userId: "This player is already in a team." },
            };
          }
        }
        throw e;
      }

      return { ok: "ADD_PLAYER" };
    }
    case "DELETE_PLAYER": {
      const tournamentTeam = await TournamentTeam.findById(data.teamId);

      validate(tournamentTeam, "Invalid team id");
      validate(data.userId !== user.id, "Can't remove self");
      validate(
        isCaptainOfTheTeam(user, tournamentTeam),
        "Not captain of the team"
      );
      validate(
        teamHasNotCheckedIn(tournamentTeam),
        "Can't remove players after checking in"
      );

      await TournamentTeamMember.del({
        memberId: data.userId,
        tournamentId: tournamentTeam.tournament.id,
      });

      return { ok: "DELETE_PLAYER" };
    }
    default: {
      const exhaustive: never = data;
      throw new Response(`Unknown action: ${JSON.stringify(exhaustive)}`, {
        status: 400,
      });
    }
  }
};

type Data = {
  ownTeam: NonNullable<Tournament.OwnTeam>;
  trustingUsers: FindManyByTrustReceiverId;
};

const typedJson = (args: Data) => json(args);

export const loader: LoaderFunction = async ({ params, context }) => {
  const parsedParams = z
    .object({ organization: z.string(), tournament: z.string() })
    .parse(params);

  const user = requireUser(context);
  const [ownTeam, trustingUsers] = await Promise.all([
    Tournament.ownTeam({
      organizerNameForUrl: parsedParams.organization,
      tournamentNameForUrl: parsedParams.tournament,
      user,
    }),
    User.findTrusters(user.id),
  ]);

  if (!ownTeam) {
    return redirect(
      tournamentURL({
        organizerNameForUrl: parsedParams.organization,
        tournamentNameForUrl: parsedParams.tournament,
      })
    );
  }

  return typedJson({
    ownTeam,
    trustingUsers: trustingUsers.filter(({ trustGiver }) => {
      return !ownTeam.members.some(({ member }) => member.id === trustGiver.id);
    }),
  });
};

// TODO: should not 404 but redirect instead - catchBoundary?
export default function ManageTeamPage() {
  const actionData = useActionData<ActionData>();
  const location = useLocation();
  const { ownTeam, trustingUsers } = useLoaderData<Data>();

  return (
    <div className="tournament__manage-team">
      {ownTeam.members.length >= TOURNAMENT_TEAM_ROSTER_MAX_SIZE && (
        <Alert type="info">
          Your team is full - more players can&apos;t be added
        </Alert>
      )}
      <div className="tournament__manage-team__roster-container">
        <TeamRoster team={ownTeam} deleteMode={!ownTeam.checkedInTime} />
      </div>
      {ownTeam.members.length < TOURNAMENT_TEAM_ROSTER_MAX_SIZE && (
        <AddPlayers
          pathname={location.pathname.replace("manage-team", "join-team")}
          inviteCode={ownTeam.inviteCode}
          trustingUsers={trustingUsers}
          hiddenInputs={[
            { name: "_action", value: "ADD_PLAYER" },
            { name: "teamId", value: ownTeam.id },
          ]}
          addUserError={actionData?.error?.userId}
          legendText="Add players to team"
        />
      )}
    </div>
  );
}

// TODO: handle 404 (logged in but not registered)
export const CatchBoundary = Catcher;

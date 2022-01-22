import { Badge, Box, Button, Flex, Grid, Heading } from "@chakra-ui/react";
import Markdown from "components/common/Markdown";
import MyLink from "components/common/MyLink";
import OutlinedBox from "components/common/OutlinedBox";
import UserAvatar from "components/common/UserAvatar";
import BadgeContainer from "components/u/BadgeContainer";
import { regularTournamentBadges } from "components/u/Badges";
import { useUser } from "hooks/common";
import Image from "next/image";
import { CalendarGet } from "pages/api/calendar";
import React from "react";
import { FiClock, FiEdit, FiExternalLink } from "react-icons/fi";
import { DiscordIcon } from "utils/assets/icons";
import { ADMIN_ID, EVENT_FORMATS, TAGS } from "utils/constants";
import { CSSVariables } from "utils/CSSVariables";
import { Unpacked } from "utils/types";

const nameToImage = [
  { code: "tasl", name: "tasl" },
  { code: "lowink", name: "low ink" },
  { code: "lobstercrossfire", name: "lobster crossfire" },
  { code: "swimorsink", name: "swim or sink" },
  { code: "idtga", name: "it's dangerous to go alone" },
  { code: "rr", name: "reef rushdown" },
  { code: "tg", name: "testing grounds" },
  { code: "ut", name: "unnamed tournament" },
  { code: "kotc", name: "king of the castle" },
  { code: "zones", name: "area cup" },
  { code: "cb", name: "cloudburst" },
  { code: "forecast", name: "forecast" },
  { code: "superjump", name: "superjump" },
  { code: "squidjunction", name: "squid junction" },
  { code: "paddlingpool", name: "paddling pool" },
  { code: "squidjunction", name: "squid junction" },
  { code: "triton-cup", name: "triton" },
  { code: "gdc", name: "girls duo cup"},
  { code: "sqss", name: "squidboard splat series"},
  { code: "sac", name: "splatoon advanced circuit"}
] as const;

/**
 * Returns event logo image path based on the event name or undefined if no image saved for the event.
 */
export const eventImage = (eventName: string) => {
  const eventNameLower = eventName.toLowerCase();
  if (eventNameLower.startsWith("plus server")) {
    return `/layout/plus.png`;
  }
  for (const { name, code } of nameToImage) {
    if (eventNameLower.startsWith(name)) {
      return `/events/${code}.png`;
    }
  }

  return undefined;
};

interface EventInfoProps {
  event: Unpacked<CalendarGet>;
  edit: () => void;
}

const EventInfo = ({ event, edit }: EventInfoProps) => {
  const poster = event.poster;

  const [user] = useUser();

  const canEdit = user?.id === poster.id || user?.id === ADMIN_ID;

  const imgSrc = eventImage(event.name);

  const badges = regularTournamentBadges.filter(
    (badgeObj) =>
      event.name.toUpperCase().includes(badgeObj.name.toUpperCase()) ||
      badgeObj.altNames?.some((altName) =>
        event.name.toUpperCase().includes(altName.toUpperCase())
      )
  );

  return (
    <OutlinedBox
      my={4}
      py={4}
      id={`event-${event.id}`}
      data-cy={`event-info-section-${event.name
        .toLowerCase()
        .replace(/ /g, "-")}`}
    >
      <Box width="100%">
        <Box textAlign="center">
          <Box>
            {imgSrc && <Image src={imgSrc} width={36} height={36} alt="" />}
            <Heading size="lg">{event.name}</Heading>
            {event.tags.length > 0 && (
              <>
                <Flex flexWrap="wrap" justifyContent="center" my={2}>
                  {event.tags.map((tag) => {
                    const tagInfo = TAGS.find((tagObj) => tagObj.code === tag)!;
                    return (
                      <Badge
                        key={tag}
                        mx={1}
                        my={1}
                        bg={tagInfo.color}
                        color="black"
                      >
                        {tagInfo.name}
                      </Badge>
                    );
                  })}
                </Flex>
                {event.tags.some((tag) => tag === "BADGE") &&
                badges.length > 0 ? (
                  <BadgeContainer
                    showInfo={false}
                    showBadges={true}
                    badges={badges.map((badge) => ({
                      src: `${badge.badgeName}.gif`,
                      description: "",
                      count: 1,
                      hueRotateAngle: badge.hueRotateAngle,
                    }))}
                  />
                ) : null}
              </>
            )}
            <Grid
              templateColumns={["1fr", "2fr 4fr 2fr"]}
              placeItems="center flex-start"
              gridRowGap="0.5rem"
              maxW="32rem"
              mx="auto"
              mt={1}
              mb={3}
            >
              <Flex placeItems="center" ml={[null, "auto"]} mx={["auto", null]}>
                <Box
                  as={FiClock}
                  mr="0.5em"
                  color={CSSVariables.themeColor}
                  justifySelf="flex-end"
                />
                {/* TODO */}
                <Box as="time" dateTime={new Date(event.date).toISOString()}>
                  {new Date(event.date).toLocaleString("en", {
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </Box>
              </Flex>
              <Flex placeItems="center" mx="auto">
                <Box
                  as={FiExternalLink}
                  mr="0.5em"
                  color={CSSVariables.themeColor}
                  justifySelf="flex-end"
                />
                <MyLink href={event.eventUrl} isExternal>
                  {new URL(event.eventUrl).host}
                </MyLink>
              </Flex>
              <Flex placeItems="center" mr={[null, "auto"]} mx={["auto", null]}>
                <UserAvatar
                  user={event.poster}
                  size="sm"
                  justifySelf="flex-end"
                  mr={2}
                />
                <MyLink href={`/u/${poster.discordId}`} isColored={false}>
                  <Box>
                    {poster.username}#{poster.discriminator}
                  </Box>
                </MyLink>
              </Flex>
            </Grid>
          </Box>

          <Grid
            templateColumns={["1fr", canEdit ? "1fr 1fr" : "1fr"]}
            gridRowGap="1rem"
            gridColumnGap="1rem"
            maxW={["12rem", canEdit ? "24rem" : "12rem"]}
            mx="auto"
            mt={4}
          >
            {event.discordInviteUrl ? (
              <MyLink href={event.discordInviteUrl} isExternal>
                <Button
                  leftIcon={<DiscordIcon />}
                  size="sm"
                  variant="outline"
                  width="100%"
                >
                  Join Discord
                </Button>
              </MyLink>
            ) : (
              <div />
            )}
            {canEdit && (
              <Button
                leftIcon={<FiEdit />}
                size="sm"
                onClick={edit}
                variant="outline"
                data-cy={`edit-button-${event.name
                  .toLowerCase()
                  .replace(/ /g, "-")}`}
              >
                Edit event
              </Button>
            )}
          </Grid>
        </Box>
        <Box mt={8} mx="0.5rem" wordBreak="break-word">
          <Box color={CSSVariables.themeGray} fontSize="small" mb={2}>
            {EVENT_FORMATS.find((format) => format.code === event.format)!.name}
          </Box>
          <Markdown smallHeaders value={event.description} />
        </Box>
      </Box>
    </OutlinedBox>
  );
};

export default EventInfo;

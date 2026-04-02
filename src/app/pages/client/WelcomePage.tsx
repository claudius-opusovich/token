import React from 'react';
import { Box, Button, Icon, Icons, Text, config, toRem } from 'folds';
import { Page, PageHero, PageHeroSection } from '../../components/page';
import TokenSVG from '../../../../public/res/svg/token.svg';

export function WelcomePage() {
  return (
    <Page>
      <Box
        grow="Yes"
        style={{ padding: config.space.S400, paddingBottom: config.space.S700 }}
        alignItems="Center"
        justifyContent="Center"
      >
        <PageHeroSection>
          <PageHero
            icon={<img width="70" height="70" src={TokenSVG} alt="Token Logo" />}
            title="Welcome to Token"
            subTitle={
              <span>Matrix messenger</span>
            }
          />
        </PageHeroSection>
      </Box>
    </Page>
  );
}

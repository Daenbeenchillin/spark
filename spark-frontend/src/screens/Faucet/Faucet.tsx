import React, { useEffect } from "react";
import Skeleton from "react-loading-skeleton";
import styled from "@emotion/styled";
import { observer } from "mobx-react";

import SizedBox from "@components/SizedBox";
import Text, { TEXT_TYPES } from "@components/Text";
import TokensFaucetTable from "@screens/Faucet/TokensFaucetTable";
import { media } from "@src/themes/breakpoints";
import { useStores } from "@stores";

interface IProps {}

const Faucet: React.FC<IProps> = observer(() => {
  const { faucetStore } = useStores();

  useEffect(() => {
    document.title = `Spark | Faucet`;
  }, []);
  return (
    <Root>
      <Text type={TEXT_TYPES.H} primary>
        Faucet for Fuel Network
      </Text>
      <SizedBox height={16} />
      {faucetStore.faucetTokens.length === 0 ? (
        <Skeleton count={4} height={48} style={{ margin: 4 }} />
      ) : (
        <TokensFaucetTable />
      )}
    </Root>
  );
});
export default Faucet;

const Root = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 16px;
  width: 100%;
  margin-bottom: 24px;
  margin-top: 40px;
  text-align: left;

  ${media.desktop} {
    margin-top: 56px;
  }
`;

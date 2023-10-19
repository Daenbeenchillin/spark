import React from "react";
import { makeAutoObservable, reaction, when } from "mobx";
import { RootStore } from "@stores";
import { ReferalContractAbi__factory } from "@src/contracts";
import { CONTRACT_ADDRESSES } from "@src/constants";
import { Address } from "fuels";
import { Column } from "@components/Flex";
import Text, { TEXT_TYPES } from "@components/Text";
import SizedBox from "@components/SizedBox";

export interface ISerializedReferralStore {
	addresses: string;
}

class ReferralStore {
	public rootStore: RootStore;

	loading: boolean = false;
	private _setLoading = (l: boolean) => (this.loading = l);

	constructor(rootStore: RootStore, initState?: ISerializedReferralStore) {
		this.rootStore = rootStore;
		makeAutoObservable(this);
		if (initState) {
			this.setVerifiedAddresses(initState.addresses?.split(",") ?? []);
		}

		when(() => this.rootStore.accountStore.initialized, this.verifyUser);
		reaction(
			() => [this.rootStore.accountStore],
			() => this.verifyUser(),
		);
	}

	verifiedAddresses: string[] = [];
	setVerifiedAddresses = (addresses: string[]) => (this.verifiedAddresses = addresses);
	addVerifiedAddress = (address: string) => {
		if (this.verifiedAddresses.includes(address)) return;
		this.setVerifiedAddresses([...this.verifiedAddresses, address]);
	};

	get access(): boolean {
		const address = this.rootStore.accountStore.address;
		if (address == null) return false;
		return this.verifiedAddresses.includes(address);
	}

	serialize = (): ISerializedReferralStore => ({
		addresses: this.verifiedAddresses.length === 0 ? "" : this.verifiedAddresses.join(","),
	});

	initialized: boolean = true;

	verifyUser = async () => {
		const { accountStore, notificationStore } = this.rootStore;
		const wallet = accountStore.walletToRead;
		const userAddress = accountStore.addressInput;
		const address = accountStore.address;
		if (wallet == null || userAddress == null || address == null) return;
		if (this.verifiedAddresses.includes(address)) return;
		this._setLoading(true);
		const refContract = ReferalContractAbi__factory.connect(CONTRACT_ADDRESSES.referral, wallet);
		await refContract.functions
			.verify(userAddress)
			.simulate()
			.then((verifyResult) => {
				console.log({ verifyResult });
				notificationStore.toast("You are verified to access app", { type: "success" });
				this.addVerifiedAddress(address);
			})
			.catch((e) => {
				console.log("not verified user");
				notificationStore.toast(
					<Column>
						<Text type={TEXT_TYPES.H1}>❌ You are not verified to access app</Text>
						<SizedBox height={8} />
						<Text type={TEXT_TYPES.NUMBER_MEDIUM}>{e.toString()}</Text>
					</Column>,
					{ type: "error" },
				);
			})
			.finally(() => this._setLoading(false));
	};

	registerUser = async (refAddress: string) => {
		const { accountStore, notificationStore } = this.rootStore;
		const wallet = await accountStore.getWallet();
		const address = accountStore.address;
		if (wallet == null || address == null) return;
		this._setLoading(true);
		const refContract = ReferalContractAbi__factory.connect(CONTRACT_ADDRESSES.referral, wallet);

		try {
			const ref = Address.fromString(refAddress).toB256();
			await refContract.functions.chekin({ value: ref }).call();
			this.addVerifiedAddress(address);
		} catch (e) {
			console.error(e);
			notificationStore.toast("Couldn't register ypu ref address", { type: "error" });
		} finally {
			this._setLoading(false);
		}
	};
}

export default ReferralStore;

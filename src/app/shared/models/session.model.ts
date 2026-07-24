import { localizeDateTime } from "../utils";

export class NewSession {
  pub_key!: string;
}

export class Session {
  id!: string;
  key_id!: string;
  pub_key!: string;
  created_ts!: string;
  data!:  string;


  get localCreatedDateTime() {
     return localizeDateTime(this.created_ts);
  }

}

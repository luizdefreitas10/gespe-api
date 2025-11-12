import { User } from "@/domain/app/enterprise/entities/user";

export class UserPresenter {
  // ou static present()
  static toHTTP(user: User) {
    return {
      id: user.id.toString(),
      userName: user.userName,
      email: user.email,
    };
  }
}

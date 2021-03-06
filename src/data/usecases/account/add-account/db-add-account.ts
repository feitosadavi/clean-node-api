import { LoadAccountByEmailRepository } from '../../authentication/db-authentication-protocols'
import { AddAccount, AddAccountParams, AccountModel, Hasher, AddAccountRepository } from './db-add-account-protocols'

export class DbAddAccount implements AddAccount {
  constructor (
    private readonly hasher: Hasher,
    private readonly addAccountRepository: AddAccountRepository,
    private readonly loadAccountByEmailRepository: LoadAccountByEmailRepository
  ) { }

  async add (accountData: AddAccountParams): Promise<AccountModel> {
    const account = await this.loadAccountByEmailRepository.loadByEmail(accountData.email)
    const hashedPassword = await this.hasher.hash(accountData.password)

    if (!account) {
      const account = await this.addAccountRepository.add(Object.assign({}, accountData, { password: hashedPassword }))
      return account
    }
    return null
  }
}

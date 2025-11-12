import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { FetchUsersUseCase } from './fetch-users'
import { makeUser } from 'test/factories/make-student'

let inMemoryUsersRepository: InMemoryUsersRepository

let sut: FetchUsersUseCase

describe('Fetch users', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()

    sut = new FetchUsersUseCase(inMemoryUsersRepository)
  })

  it('should be able to get all users in database', async () => {
    await inMemoryUsersRepository.createUser(
      makeUser({
        userName: 'John Doe',
        email: 'johndoe@email.com',
        password: '123456',
      }),
    )

    await inMemoryUsersRepository.createUser(
      makeUser({
        userName: 'Jane Doe',
        email: 'janedoe@email.com',
        password: '123456',
      }),
    )

    await inMemoryUsersRepository.createUser(
      makeUser({
        userName: 'Lukas Doe',
        email: 'lukasdoe@email.com',
        password: '123456',
      }),
    )

    const result = await sut.execute({
      page: 1,
    })

    expect(result.value?.users).toEqual([
      expect.objectContaining({
        userName: 'John Doe',
        email: 'johndoe@email.com',
        password: '123456',
      }),
      expect.objectContaining({
        userName: 'Jane Doe',
        email: 'janedoe@email.com',
        password: '123456',
      }),
      expect.objectContaining({
        userName: 'Lukas Doe',
        email: 'lukasdoe@email.com',
        password: '123456',
      }),
    ])
  })
})

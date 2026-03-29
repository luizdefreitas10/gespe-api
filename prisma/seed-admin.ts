import 'dotenv/config'
import { PrismaClient, Role, Status } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

function required(name: string): string {
  const value = process.env[name]

  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }

  return value.trim()
}

async function main() {
  const email = required('ADMIN_EMAIL').toLowerCase()
  const password = required('ADMIN_PASSWORD')
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'System Administrator'
  const position = process.env.ADMIN_POSITION?.trim() || 'Administrator'
  const department = process.env.ADMIN_DEPARTMENT?.trim() || 'IT'
  const birthDateRaw = process.env.ADMIN_BIRTH_DATE?.trim() || '1990-01-01'
  const birthDate = new Date(birthDateRaw)

  if (Number.isNaN(birthDate.getTime())) {
    throw new Error(
      `Invalid ADMIN_BIRTH_DATE value: "${birthDateRaw}". Use YYYY-MM-DD format.`,
    )
  }

  const passwordHash = await hash(password, 8)

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (!existingUser) {
    const created = await prisma.user.create({
      data: {
        fullName,
        email,
        password: passwordHash,
        birthDate,
        position,
        department,
        role: Role.ADMIN,
      },
    })

    console.log('Admin user created successfully.')
    console.log(`id: ${created.id}`)
    console.log(`email: ${created.email}`)
    console.log(`role: ${created.role}`)
    return
  }

  const updated = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      fullName,
      password: passwordHash,
      birthDate,
      position,
      department,
      role: Role.ADMIN,
      status: Status.ACTIVE,
    },
  })

  console.log('Existing user updated to ADMIN successfully.')
  console.log(`id: ${updated.id}`)
  console.log(`email: ${updated.email}`)
  console.log(`role: ${updated.role}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

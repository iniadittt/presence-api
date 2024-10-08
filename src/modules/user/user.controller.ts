import { Request, Response } from 'express';
import { responseJson, responseError } from '../../common/response';
import { environment } from '../../common/environment';
import prisma from '../../common/prismaclient';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import sendEmail from '../../libs/nodemailer';
import { User, Notification, Role } from '@prisma/client';
import { RegisterBody, LoginBody, UpdateProfileBody, updatePasswordBody, VerifyBody, AddUserBody, UpdateUserBody, UpdatePasswordUserBody } from './user.interface';
import { registerHtml } from '../../libs/register.html';
import { generateRandomNumber } from '../../libs/generateRandomNumber';
import { getTokenHtml } from '../../libs/getToken.html';
import { dataNotification } from '../../libs/dataNotification';

export default class UserController {
    constructor() { }

    async login(request: Request, response: Response) {
        try {
            const { email, password }: LoginBody = request.body;
            const user: User | null = await prisma.user.findUnique({ where: { email, active: true } });
            if (!user) return responseJson(response, 400, 'Bad request', 'Email atau password salah');
            const matchPassword: boolean = bcrypt.compareSync(password, user.password);
            if (!matchPassword) return responseJson(response, 400, 'Bad request', 'Email atau password salah');
            const token: string = jwt.sign({ email: user.email }, environment.jwt.secret as string, { expiresIn: environment.jwt.expiresIn });
            const updateToken: User = await prisma.user.update({ where: { id: user.id }, data: { token } });
            if (!updateToken) return responseJson(response, 500, 'Internal server error', 'Login gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.login.title, description: dataNotification.user.login.description, userId: user.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 200, 'Success', 'Login berhasil', { token });
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async loginAdmin(request: Request, response: Response) {
        try {
            const { email, password }: LoginBody = request.body;
            const user: User | null = await prisma.user.findUnique({ where: { email, active: true } });
            if (!user) return responseJson(response, 400, 'Bad request', 'Email atau password salah');
            if (user.role !== Role.admin) return responseJson(response, 400, 'Bad request', 'Email atau password salah');
            const matchPassword: boolean = bcrypt.compareSync(password, user.password);
            if (!matchPassword) return responseJson(response, 400, 'Bad request', 'Email atau password salah');
            const token: string = jwt.sign({ email: user.email }, environment.jwt.secret as string, { expiresIn: environment.jwt.expiresIn });
            const updateToken: User = await prisma.user.update({ where: { id: user.id }, data: { token } });
            if (!updateToken) return responseJson(response, 500, 'Internal server error', 'Login gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.login.title, description: dataNotification.user.login.description, userId: user.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 200, 'Success', 'Login berhasil', { token });
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async register(request: Request, response: Response) {
        try {
            const { email, password, name, phone }: RegisterBody = request.body;
            const user: User | null = await prisma.user.findUnique({ where: { email } });
            if (user && user.active) return responseJson(response, 409, 'Conflict', 'Email sudah digunakan')
            if (user && !user.active) {
                const randomNumber: number = generateRandomNumber(6)
                const html: string = registerHtml(randomNumber)
                await sendEmail(email, 'Presence - Verify Your Account', html)
                const updateOtp: User = await prisma.user.update({ where: { id: user.id }, data: { otp: `${randomNumber}` } });
                if (!updateOtp) return responseJson(response, 500, 'Internal server error', 'Register gagal');
                const todayUTC: Date = new Date();
                const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
                const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
                const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
                const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.register.title, description: dataNotification.user.register.description, userId: user.id, createdAt: todayInUTCPlus7 } })
                if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
                return responseJson(response, 200, 'Success', 'Register berhasil');
            }
            const hashPassword: string = bcrypt.hashSync(password, 10);
            const createdUser: User | null = await prisma.user.create({ data: { email, password: hashPassword, name, phone } });
            if (!createdUser) return responseJson(response, 500, 'Internal server error', 'Register gagal');
            const randomNumber: number = generateRandomNumber(6)
            const html: string = registerHtml(randomNumber)
            await sendEmail(email, 'Presence - Verify Your Account', html)
            const updateOtp: User = await prisma.user.update({ where: { id: createdUser.id }, data: { otp: `${randomNumber}` } });
            if (!updateOtp) return responseJson(response, 500, 'Internal server error', 'Register gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.register.title, description: dataNotification.user.register.description, userId: createdUser.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 200, 'Success', 'Register berhasil');
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async verify(request: Request, response: Response) {
        try {
            const { email, otp }: VerifyBody = request.body;
            const user: User | null = await prisma.user.findUnique({ where: { email, active: false } });
            if (!user) return responseJson(response, 400, 'Bad request', 'User tidak ditemukan');
            const matchOtp: boolean = user.otp === otp;
            if (!matchOtp) return responseJson(response, 400, 'Bad request', 'Kode OTP salah');
            const updateUser: User = await prisma.user.update({ where: { email: user.email }, data: { otp: null, active: true } });
            if (!updateUser) return responseJson(response, 500, 'Internal server error', 'Verifikasi akun gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.verify.title, description: dataNotification.user.verify.description, userId: user.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 201, 'Created', 'Verifikasi akun berhasil');
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async getOtp(request: Request, response: Response) {
        try {
            const { email }: { email: string } = request.body;
            const user: User | null = await prisma.user.findUnique({ where: { email, active: false } });
            if (!user) return responseJson(response, 400, 'Bad request', 'User tidak ditemukan');
            const randomNumber: number = generateRandomNumber(6)
            const html: string = getTokenHtml(randomNumber)
            await sendEmail(email, 'Presence - Verify Your Account', html)
            const updateOtp: User = await prisma.user.update({ where: { email, active: false }, data: { otp: `${randomNumber}` } });
            if (!updateOtp) return responseJson(response, 500, 'Internal server error', 'Get token gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.getOtp.title, description: dataNotification.user.getOtp.description, userId: user.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 200, 'Success', 'Mengambil OTP baru berhasil');
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async getMyProfile(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user) return responseJson(response, 400, 'Bad request', 'User tidak ditemukan');
            return responseJson(response, 200, 'Success', 'Berhasil mengambil data profile', { user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role } });
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async updateMyProfile(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user) return responseJson(response, 400, 'Bad request', 'User tidak ditemukan');
            const { name, phone }: UpdateProfileBody = request.body;
            const updatedUser: User | null = await prisma.user.update({ where: { id: user.id }, data: { name, phone } });
            if (!updatedUser) return responseJson(response, 500, 'Internal server error', 'Update profile gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.updateProfile.title, description: dataNotification.user.updateProfile.description, userId: user.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 200, 'Success', 'Update profile berhasil');
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async updateMyPassword(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user) return responseJson(response, 400, 'Bad request', 'User tidak ditemukan');
            const { passwordLama, passwordBaru, konfirmasiPasswordBaru }: updatePasswordBody = request.body;
            const matchPassword: boolean = passwordBaru === konfirmasiPasswordBaru;
            if (!matchPassword) return responseJson(response, 400, 'Bad request', 'Password baru dan konfirmasi password baru tidak sama');
            const checkPassword: boolean = bcrypt.compareSync(passwordLama, user.password);
            if (!checkPassword) return responseJson(response, 400, 'Bad request', 'Password lama salah');
            const hashPassword: string = bcrypt.hashSync(passwordBaru, 10);
            const updatedUser: User | null = await prisma.user.update({ where: { id: user.id }, data: { password: hashPassword } });
            if (!updatedUser) return responseJson(response, 500, 'Internal server error', 'Ubah password gagal');
            const todayUTC: Date = new Date();
            const currentUTCOffsetInMilliseconds = todayUTC.getTimezoneOffset() * 60 * 1000;
            const utcPlus7OffsetInMilliseconds = 7 * 60 * 60 * 1000;
            const todayInUTCPlus7: Date = new Date(todayUTC.getTime() + currentUTCOffsetInMilliseconds + utcPlus7OffsetInMilliseconds);
            const addNotification: Notification = await prisma.notification.create({ data: { title: dataNotification.user.updatePassword.title, description: dataNotification.user.updatePassword.description, userId: user.id, createdAt: todayInUTCPlus7 } })
            if (!addNotification) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server')
            return responseJson(response, 200, 'Success', 'Update password berhasil');
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async getUsers(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user || user.role !== Role.admin) return responseJson(response, 403, 'Forbidden', 'User tidak memiliki akses');
            const users: User[] | [] = await prisma.user.findMany();
            if (users.length === 0) return responseJson(response, 404, 'Not found', 'Data user tidak ditemukan');
            return responseJson(response, 200, 'Success', 'Get data users berhasil', {
                users: users.map((user: User) => {
                    const { password, ...data } = user
                    return data
                })
            });
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async getUser(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user || user.role !== Role.admin) return responseJson(response, 403, 'Forbidden', 'User tidak memiliki akses');
            const id: number = parseInt(request.params.id as string);
            if (!id) return responseJson(response, 400, 'Bad request', 'ID user tidak valid');
            const users: User | null = await prisma.user.findUnique({ where: { id } });
            if (!users) return responseJson(response, 404, 'Not found', 'Data user tidak ditemukan');
            const { password, ...data } = users
            return responseJson(response, 200, 'Success', 'Get data users berhasil', { user: data });
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async addUser(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user || user.role !== Role.admin) return responseJson(response, 403, 'Forbidden', 'User tidak memiliki akses');
            const { email, name, password, phone, role }: AddUserBody = request.body
            const checkEmailUsed: User | null = await prisma.user.findUnique({ where: { email } });
            if (checkEmailUsed) return responseJson(response, 400, 'Bad request', 'Email sudah digunakan');
            const hashPassword: string = bcrypt.hashSync(password, 10);
            const addUser: User | null = await prisma.user.create({ data: { email, name, password: hashPassword, phone, role, active: true } });
            if (!addUser) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server');
            return responseJson(response, 200, 'Success', 'Tambah data users berhasil');
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async updateUser(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user || user.role !== Role.admin) return responseJson(response, 403, 'Forbidden', 'User tidak memiliki akses');
            const id: number = parseInt(request.params.id as string);
            if (!id) return responseJson(response, 400, 'Bad request', 'ID user tidak valid');
            const { name, phone, role, active }: UpdateUserBody = request.body
            const checkUser: User | null = await prisma.user.findUnique({ where: { id } });
            if (!checkUser) return responseJson(response, 400, 'Bad request', 'User tidak ada');
            const updateUser: User | null = await prisma.user.update({
                where: { id: checkUser.id }, data: {
                    name: name || checkUser.name,
                    phone: phone || checkUser.phone,
                    role: role || checkUser.role,
                    active: active === 'true'
                }
            });
            if (!updateUser) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server');
            return responseJson(response, 200, 'Success', `Update data users dengan email ${updateUser.email} berhasil`);
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async updatePasswordUser(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user || user.role !== Role.admin) return responseJson(response, 403, 'Forbidden', 'User tidak memiliki akses');
            const id: number = parseInt(request.params.id as string);
            if (!id) return responseJson(response, 400, 'Bad request', 'ID user tidak valid');
            const { password, konfirmasiPassword }: UpdatePasswordUserBody = request.body
            const checkEmailUsed: User | null = await prisma.user.findUnique({ where: { id } });
            if (!checkEmailUsed) return responseJson(response, 400, 'Bad request', 'User tidak ada');
            if (password !== konfirmasiPassword) return responseJson(response, 400, 'Bad request', 'Password tidak sama');
            const hashPassword: string = bcrypt.hashSync(password, 10);
            const updateUser: User | null = await prisma.user.update({
                where: { id }, data: {
                    password: hashPassword
                }
            });
            if (!updateUser) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server');
            return responseJson(response, 200, 'Success', `Update password user dengan email ${updateUser.email} berhasil`);
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }

    async deleteUser(request: any, response: Response) {
        try {
            const user: User | undefined = request.user;
            if (!user || user.role !== Role.admin) return responseJson(response, 403, 'Forbidden', 'User tidak memiliki akses');
            const id: number = parseInt(request.params.id as string);
            if (!id) return responseJson(response, 400, 'Bad request', 'ID user tidak valid');
            const checkEmailUsed: User | null = await prisma.user.findUnique({ where: { id } });
            if (!checkEmailUsed) return responseJson(response, 400, 'Bad request', 'User tidak ada');
            if (checkEmailUsed.email === 'admin@presence.com') return responseJson(response, 400, 'Bad request', 'Super admin tidak bisa dihapus')
            const deleteUser = await prisma.$transaction([
                prisma.presence.deleteMany({ where: { userId: id } }),
                prisma.laporan.deleteMany({ where: { userId: id } }),
                prisma.notification.deleteMany({ where: { userId: id } }),
                prisma.user.delete({ where: { id } })
            ]);
            if (!deleteUser) return responseJson(response, 500, 'Internal server error', 'Terjadi kesalahan pada server');
            return responseJson(response, 200, 'Success', `Delete data users dengan email ${checkEmailUsed.email} berhasil`);
        } catch (error: any) {
            return responseError(response, 500, 'Internal server error', 'Terjadi kesalahan pada server', error.message);
        }
    }
}
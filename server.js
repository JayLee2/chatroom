const http=require('http');
const fs=require('fs');
const io=require('socket.io');
const check=require('./check');
const mysql=require('mysql');
let db=mysql.createPool({host:"localhost",user:"root",password:"zmkm2018^_^",database:"chatroom"});
const httpSever=http.createServer((req,res)=>{
    fs.readFile(`read${req.url}`,(err,data)=>{
        if(err){
            res.writeHeader(404)
            res.write('not fonund')
        }else{
            res.write(data);
        }
        res.end()
    })
});
httpSever.listen(2222,function () {
    console.log('监听成功')
});
const ws=io.listen(httpSever);
let socks=[];
ws.on('connection',sock=>{
    let current_id=0;
    let current_user='';
    //注册模块；
    sock.on('reg',(user,pass)=>{
        if(!check.user.test(user)){
            sock.emit('reg_ret',1,'用户名不能小于6位')
        }else if(!check.user.test(pass)){
            sock.emit('reg_ret',1,'密码不能小于6位')
        }else{
            db.query(`select * from user where user='${user}'`,(err,data)=>{
                if(err){
                    sock.emit('reg_ret',1,'数据库错误');
                }else if(data.length>0){
                    sock.emit('reg_ret',1,'用户名已存在');
                }else{
                    db.query(`insert into user (user,pass) values ('${user}','${pass}')`,err=>{
                        if(err){
                            sock.emit('reg_ret',1,'数据库错误')
                        }else{
                            sock.emit('reg_ret',0,'注册成功')
                        }
                    })
                }
            })
        }
    });
    //登陆模块；
    sock.on('login',(user,pass)=>{
        db.query(`select * from user where user='${user}' and pass='${pass}'`,(err,data)=>{
            if(err){
                sock.emit('login_ret',1,'数据库错误');
            }else{
                if(data.length==0){
                    sock.emit('login_ret',1,'用户名或密码不正确');
                }else{
                    db.query(`update user set online='1' where id=${data[0].id}`,err=>{
                        if(err){
                            sock.emit('login_ret',1,'数据库错误');
                        }else{
                            sock.emit('login_ret',0,data[0].user);
                            current_id=data[0].id
                            current_user=data[0].user;
                            socks.push(sock);
                        }
                    })
                }
            }
        });
    });
    //发送
    sock.on('send',(word)=>{
        if(!word){
            sock.emit('send_ret',1,'不能发送空消息');
        }else{
            socks.forEach((value)=>{
                if(value==sock){
                    return;
                }else{
                    value.emit('msg',current_user,word);
                }
            });
            sock.emit('send_ret',0,word);
        }
    })
    //推出模块
    sock.on('disconnect',()=>{
        db.query(`update user set online=0 where id=${current_id}`,err=>{
            if(err){
                console.log('数据库错误');
            }else{
                socks.filter((item)=>{
                    return item!=sock;
                })
            }
        })
    })
})
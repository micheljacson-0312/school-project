import { useSite } from '../../lib/site.jsx';
import { SmartImage } from '../../components/Placeholder.jsx';
import Title from '../../components/Title.jsx';

export default function AboutPage() {
  const { settings, principal, achievements } = useSite();
  return (
    <div>
      <Title>About us</Title>
      {/* Hero strip */}
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">About {settings.school_name}</h1>
          <p className="text-brand-100 mt-2 max-w-2xl">{settings.school_tagline}</p>
        </div>
      </section>

      {/* Mission + principal */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-2xl font-semibold">Our story</h2>
          <p className="text-slate-700 leading-relaxed">
            {settings.school_name} has been part of the community for over six decades.
            From its founding as a small neighbourhood school, it has grown into a full
            primary and secondary institution while keeping the same mission: to give every
            child a rigorous, character-building education in a caring environment.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Our campus combines traditional classrooms with purpose-built science labs,
            a library, computer rooms, and a sports ground. We follow the national curriculum
            with supplementary programmes in arts, debate, and community service.
          </p>
          <h2 className="text-2xl font-semibold pt-4">Mission</h2>
          <p className="text-slate-700 leading-relaxed">
            To nurture curious, capable, and compassionate young people who go on to lead
            and serve in their communities.
          </p>
        </div>
        {principal && (
          <div className="card">
            <div className="card-body">
              <SmartImage src={principal.photo_url} label={principal.principal_name} aspect="1/1" rounded="rounded-md" />
              <h3 className="font-semibold mt-3">{principal.principal_name}</h3>
              <p className="text-sm text-slate-500">{principal.designation}</p>
              <p className="text-sm text-slate-700 mt-3 line-clamp-4">{principal.message_body.split('\n')[0]}</p>
            </div>
          </div>
        )}
      </section>

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-semibold mb-6">Achievements</h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              {achievements.map(a => (
                <li key={a.id} className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 grid place-items-center text-xl shrink-0">
                    {a.icon === 'trophy' && '🏆'}
                    {a.icon === 'medal'  && '🥇'}
                    {a.icon === 'star'   && '⭐'}
                    {a.icon === 'flask'  && '🧪'}
                    {a.icon === 'book'   && '📚'}
                  </div>
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.year}</div>
                    {a.description && <p className="text-sm text-slate-600 mt-1">{a.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Quick facts */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-3 gap-4 text-center">
        <div className="card"><div className="card-body"><div className="text-3xl font-bold text-brand-700">60+</div><div className="text-sm text-slate-500 mt-1">Years of service</div></div></div>
        <div className="card"><div className="card-body"><div className="text-3xl font-bold text-brand-700">1,200</div><div className="text-sm text-slate-500 mt-1">Students enrolled</div></div></div>
        <div className="card"><div className="card-body"><div className="text-3xl font-bold text-brand-700">75</div><div className="text-sm text-slate-500 mt-1">Teaching & admin staff</div></div></div>
      </section>
    </div>
  );
}
